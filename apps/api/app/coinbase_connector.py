from dataclasses import dataclass
from decimal import Decimal
import logging
from typing import Any

from coinbase.rest import RESTClient

from .auth import decrypt_secret
from .models import BrokerConnection

logger = logging.getLogger(__name__)


@dataclass
class CoinbasePosition:
    symbol: str
    asset_name: str
    asset_type: str
    quantity: Decimal
    market_value: Decimal
    currency: str
    metadata: dict


@dataclass
class CoinbaseSyncResult:
    positions: list[CoinbasePosition]
    trades: list[dict]
    permissions: dict
    external_portfolio_id: str | None
    external_account_ids: list[str]
    total_value: Decimal


def _classify_asset(currency: str) -> str:
    fiat = {"EUR", "USD", "USDC", "GBP"}
    return "cash" if currency.upper() in fiat else "crypto"


def _safe_decimal(value: object, fallback: str = "0") -> Decimal:
    raw = value if value not in (None, "") else fallback
    return Decimal(str(raw))


def _as_dict(payload: Any) -> dict:
    if payload is None:
        return {}
    if isinstance(payload, dict):
        return payload
    if hasattr(payload, "to_dict"):
        try:
            converted = payload.to_dict()
            return converted if isinstance(converted, dict) else {}
        except Exception:
            return {}
    if hasattr(payload, "__dict__") and isinstance(payload.__dict__, dict):
        return payload.__dict__
    return {}


def _extract_accounts(accounts_response: Any) -> list[dict]:
    payload = _as_dict(accounts_response)
    if isinstance(payload.get("accounts"), list):
        return [item for item in payload.get("accounts", []) if isinstance(item, dict)]
    if isinstance(payload.get("data"), list):
        return [item for item in payload.get("data", []) if isinstance(item, dict)]

    raw_accounts = getattr(accounts_response, "accounts", None)
    if isinstance(raw_accounts, list):
        normalized: list[dict] = []
        for item in raw_accounts:
            if isinstance(item, dict):
                normalized.append(item)
            else:
                item_dict = _as_dict(item)
                if item_dict:
                    normalized.append(item_dict)
        return normalized
    return []


def _extract_fills(fills_response: Any) -> list[dict]:
    payload = _as_dict(fills_response)
    if isinstance(payload.get("fills"), list):
        return [item for item in payload.get("fills", []) if isinstance(item, dict)]
    if isinstance(payload.get("data"), list):
        return [item for item in payload.get("data", []) if isinstance(item, dict)]

    raw_fills = getattr(fills_response, "fills", None)
    if isinstance(raw_fills, list):
        normalized: list[dict] = []
        for item in raw_fills:
            if isinstance(item, dict):
                normalized.append(item)
            else:
                item_dict = _as_dict(item)
                if item_dict:
                    normalized.append(item_dict)
        return normalized
    return []


def _extract_next_cursor(accounts_response: Any) -> str | None:
    payload = _as_dict(accounts_response)
    for key in ("next_cursor", "cursor", "nextPageCursor"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _extract_has_next(accounts_response: Any) -> bool:
    payload = _as_dict(accounts_response)
    for key in ("has_next", "has_next_page", "hasNext"):
        value = payload.get(key)
        if isinstance(value, bool):
            return value
    return False


def _extract_price(client: RESTClient, currency: str) -> Decimal:
    currency = currency.upper()
    if currency == "EUR":
        return Decimal("1")

    product_candidates = [
        f"{currency}-EUR",
        f"{currency}-USDC",
        f"{currency}-USD",
    ]
    for product_id in product_candidates:
        try:
            product = client.get_product(product_id=product_id)
            price = getattr(product, "price", None)
            if price is not None:
                value = _safe_decimal(price)
                if product_id.endswith("-EUR"):
                    return value
                if product_id.endswith("-USDC") or product_id.endswith("-USD"):
                    return value * Decimal("0.92")
        except Exception:
            logger.debug("Unable to resolve Coinbase product price", extra={"product_id": product_id})
            continue
    return Decimal("0")


def sync_coinbase_read_only(connection: BrokerConnection) -> CoinbaseSyncResult:
    if not connection.api_key_encrypted or not connection.api_secret_encrypted:
        raise ValueError("Coinbase credentials are missing")

    api_key = decrypt_secret(connection.api_key_encrypted)
    api_secret = decrypt_secret(connection.api_secret_encrypted)
    # Coinbase secrets are often stored with escaped newlines.
    if "\\n" in api_secret and "-----BEGIN" in api_secret:
        api_secret = api_secret.replace("\\n", "\n")
    client = RESTClient(api_key=api_key, api_secret=api_secret, timeout=15)

    permissions_response = client.get_api_key_permissions()
    permissions = _as_dict(permissions_response)
    portfolio_id = (
        permissions.get("portfolio_uuid")
        or permissions.get("retail_portfolio_id")
        or permissions.get("portfolio_id")
    )

    try:
        accounts_response = client.get_accounts(limit=250, retail_portfolio_id=portfolio_id) if portfolio_id else client.get_accounts(limit=250)
    except TypeError:
        # Older/newer SDK variants may not accept retail_portfolio_id.
        accounts_response = client.get_accounts(limit=250)
    accounts = _extract_accounts(accounts_response)

    # Follow pagination cursors so subsequent syncs include all accounts.
    cursor = _extract_next_cursor(accounts_response)
    has_next = _extract_has_next(accounts_response)
    page_guard = 0
    while has_next and cursor and page_guard < 20:
        page_guard += 1
        try:
            next_response = (
                client.get_accounts(limit=250, cursor=cursor, retail_portfolio_id=portfolio_id)
                if portfolio_id
                else client.get_accounts(limit=250, cursor=cursor)
            )
        except TypeError:
            try:
                next_response = client.get_accounts(limit=250, cursor=cursor)
            except TypeError:
                break

        next_accounts = _extract_accounts(next_response)
        if not next_accounts:
            break
        accounts.extend(next_accounts)
        cursor = _extract_next_cursor(next_response)
        has_next = _extract_has_next(next_response)

    positions: list[CoinbasePosition] = []
    trades: list[dict] = []
    total_value = Decimal("0")
    external_account_ids: list[str] = []

    for account in accounts:
        account_uuid = account.get("uuid")
        if account_uuid:
            external_account_ids.append(account_uuid)
        available_balance = account.get("available_balance") or {}
        hold_balance = account.get("hold") or {}
        full_balance = account.get("balance") or {}
        available_qty = _safe_decimal(available_balance.get("value"), "0")
        hold_qty = _safe_decimal(hold_balance.get("value"), "0")
        quantity = _safe_decimal(full_balance.get("value"), "0")
        if quantity <= 0:
            quantity = available_qty + hold_qty
        currency = str(account.get("currency") or full_balance.get("currency") or available_balance.get("currency") or "EUR").upper()
        if quantity <= 0:
            continue

        native_balance = account.get("native_balance") or {}
        native_value = _safe_decimal(native_balance.get("value"), "0")
        native_currency = str(native_balance.get("currency") or "").upper()
        if native_value > 0:
            if native_currency == "EUR":
                market_value = native_value.quantize(Decimal("0.01"))
            elif native_currency in {"USD", "USDC"}:
                market_value = (native_value * Decimal("0.92")).quantize(Decimal("0.01"))
            else:
                price_in_eur = _extract_price(client, currency)
                market_value = quantity if currency == "EUR" else (quantity * price_in_eur).quantize(Decimal("0.01"))
        else:
            price_in_eur = _extract_price(client, currency)
            market_value = quantity if currency == "EUR" else (quantity * price_in_eur).quantize(Decimal("0.01"))
        total_value += market_value
        positions.append(
            CoinbasePosition(
                symbol=currency,
                asset_name=str(account.get("name") or currency),
                asset_type=_classify_asset(currency),
                quantity=quantity,
                market_value=market_value,
                currency="EUR",
                metadata={
                    "native_currency": currency,
                    "available_quantity": str(available_qty),
                    "hold_quantity": str(hold_qty),
                    "raw_balance": available_balance,
                    "account_uuid": account_uuid,
                    "account_type": account.get("type"),
                },
            )
        )

    # Pull executed fills to build real buy/sell history.
    fills: list[dict] = []
    try:
        fills_response = client.get_fills(limit=250, retail_portfolio_id=portfolio_id) if portfolio_id else client.get_fills(limit=250)
    except TypeError:
        try:
            fills_response = client.get_fills(limit=250)
        except Exception:
            fills_response = None
    except Exception:
        fills_response = None

    if fills_response is not None:
        fills.extend(_extract_fills(fills_response))
        fill_cursor = _extract_next_cursor(fills_response)
        fill_has_next = _extract_has_next(fills_response)
        fill_page_guard = 0
        while fill_has_next and fill_cursor and fill_page_guard < 10:
            fill_page_guard += 1
            try:
                next_fills_response = (
                    client.get_fills(limit=250, cursor=fill_cursor, retail_portfolio_id=portfolio_id)
                    if portfolio_id
                    else client.get_fills(limit=250, cursor=fill_cursor)
                )
            except TypeError:
                try:
                    next_fills_response = client.get_fills(limit=250, cursor=fill_cursor)
                except Exception:
                    break
            except Exception:
                break

            page_fills = _extract_fills(next_fills_response)
            if not page_fills:
                break
            fills.extend(page_fills)
            fill_cursor = _extract_next_cursor(next_fills_response)
            fill_has_next = _extract_has_next(next_fills_response)

    dedupe: set[str] = set()
    for fill in fills:
        side_raw = str(fill.get("side") or fill.get("trade_side") or "buy").lower()
        action = "sell" if side_raw.startswith("sell") else "buy"
        product_id = str(fill.get("product_id") or "")
        asset = product_id.split("-")[0] if "-" in product_id else str(fill.get("size_in_quote") or fill.get("asset") or "UNKNOWN")
        size = _safe_decimal(fill.get("size") or fill.get("base_size") or "0")
        price = _safe_decimal(fill.get("price") or "0")
        notional = _safe_decimal(fill.get("size_in_quote") or "0")
        amount = notional if notional > 0 else (size * price)
        if amount <= 0:
            continue

        trade_id = str(fill.get("trade_id") or fill.get("entry_id") or "")
        date = str(fill.get("trade_time") or fill.get("created_time") or fill.get("time") or "")
        uniq_key = trade_id or f"{asset}|{action}|{amount}|{date}"
        if uniq_key in dedupe:
            continue
        dedupe.add(uniq_key)

        trades.append(
            {
                "trade_id": trade_id or uniq_key,
                "asset": asset,
                "action": action,
                "amount": float(amount.quantize(Decimal("0.01"))),
                "quantity": float(size),
                "price": float(price),
                "fee": float(_safe_decimal(fill.get("commission") or fill.get("fee") or "0").quantize(Decimal("0.01"))),
                "date": date,
            }
        )

    trades.sort(key=lambda item: item.get("date") or "", reverse=True)

    return CoinbaseSyncResult(
        positions=positions,
        trades=trades[:300],
        permissions=permissions,
        external_portfolio_id=portfolio_id,
        external_account_ids=external_account_ids,
        total_value=total_value.quantize(Decimal("0.01")) if positions else Decimal("0.00"),
    )