from dataclasses import dataclass

import httpx


@dataclass(frozen=True)
class OddsSelection:
    bookmaker: str
    outcome: str
    price: float


@dataclass(frozen=True)
class OddsEvent:
    event_id: str
    sport_key: str
    commence_time: str
    home_team: str
    away_team: str
    selections: list[OddsSelection]


class OddsProviderError(RuntimeError):
    pass


async def fetch_the_odds_api_events(
    api_key: str,
    sport_key: str,
    base_url: str,
    regions: str = "eu",
    markets: str = "h2h",
    odds_format: str = "decimal",
    date_format: str = "iso",
) -> list[OddsEvent]:
    if not api_key:
        raise OddsProviderError("Missing THE_ODDS_API_KEY")

    url = f"{base_url.rstrip('/')}/sports/{sport_key}/odds"
    params = {
        "apiKey": api_key,
        "regions": regions,
        "markets": markets,
        "oddsFormat": odds_format,
        "dateFormat": date_format,
    }

    async with httpx.AsyncClient(timeout=12.0) as client:
        response = await client.get(url, params=params)
    if response.status_code >= 400:
        raise OddsProviderError(f"The Odds API error {response.status_code}: {response.text[:240]}")

    payload = response.json()
    events: list[OddsEvent] = []
    for row in payload if isinstance(payload, list) else []:
        if not isinstance(row, dict):
            continue
        bookmakers = row.get("bookmakers") if isinstance(row.get("bookmakers"), list) else []
        selections: list[OddsSelection] = []
        for bookmaker in bookmakers:
            if not isinstance(bookmaker, dict):
                continue
            bookmaker_name = str(bookmaker.get("title") or bookmaker.get("key") or "unknown")
            markets_rows = bookmaker.get("markets") if isinstance(bookmaker.get("markets"), list) else []
            for market in markets_rows:
                if not isinstance(market, dict):
                    continue
                outcomes = market.get("outcomes") if isinstance(market.get("outcomes"), list) else []
                for outcome in outcomes:
                    if not isinstance(outcome, dict):
                        continue
                    try:
                        price = float(outcome.get("price"))
                    except (TypeError, ValueError):
                        continue
                    if price <= 1.0:
                        continue
                    selections.append(
                        OddsSelection(
                            bookmaker=bookmaker_name,
                            outcome=str(outcome.get("name") or "unknown"),
                            price=price,
                        )
                    )

        if selections:
            events.append(
                OddsEvent(
                    event_id=str(row.get("id") or ""),
                    sport_key=str(row.get("sport_key") or sport_key),
                    commence_time=str(row.get("commence_time") or ""),
                    home_team=str(row.get("home_team") or ""),
                    away_team=str(row.get("away_team") or ""),
                    selections=selections,
                )
            )

    return events
