from dataclasses import dataclass
from decimal import Decimal
import logging

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
    client = RESTClient(api_key=api_key, api_secret=api_secret, timeout=15)

    permissions_response = client.get_api_key_permissions()
    permissions = permissions_response.to_dict() if hasattr(permissions_response, "to_dict") else permissions_response.__dict__
    portfolio_id = permissions.get("portfolio_uuid")

    accounts_response = client.get_accounts(limit=250, retail_portfolio_id=portfolio_id)
    accounts_payload = accounts_response.to_dict() if hasattr(accounts_response, "to_dict") else accounts_response.__dict__
    accounts = accounts_payload.get("accounts", [])

    positions: list[CoinbasePosition] = []
    total_value = Decimal("0")
    external_account_ids: list[str] = []

    for account in accounts:
        account_uuid = account.get("uuid")
        if account_uuid:
            external_account_ids.append(account_uuid)
        available_balance = account.get("available_balance") or {}
        quantity = _safe_decimal(available_balance.get("value"), "0")
        currency = str(account.get("currency") or available_balance.get("currency") or "EUR").upper()
        if quantity <= 0:
            continue

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
                    "raw_balance": available_balance,
                    "account_uuid": account_uuid,
                    "account_type": account.get("type"),
                },
            )
        )

    return CoinbaseSyncResult(
        positions=positions,
        permissions=permissions,
        external_portfolio_id=portfolio_id,
        external_account_ids=external_account_ids,
        total_value=total_value.quantize(Decimal("0.01")) if positions else Decimal("0.00"),
    )