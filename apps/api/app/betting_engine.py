from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class OddsQuote:
    bookmaker: str
    odds: float


@dataclass(frozen=True)
class EventInput:
    event_id: str
    event_label: str
    sport: str
    model_win_probability: float
    quotes: list[OddsQuote]


@dataclass(frozen=True)
class RiskInput:
    bankroll_eur: float
    kelly_fraction: float
    min_edge: float
    max_stake_pct_per_bet: float
    max_stake_eur: float | None


@dataclass(frozen=True)
class ValueOpportunity:
    event_id: str
    event_label: str
    sport: str
    bookmaker: str
    best_odds: float
    model_probability: float
    implied_probability: float
    edge_probability: float
    value_score: float
    stake_eur: float
    stake_pct_bankroll: float
    decision: str


def implied_probability(odds: float) -> float:
    if odds <= 1:
        raise ValueError("odds must be > 1")
    return 1.0 / odds


def value_score(model_probability: float, odds: float) -> float:
    # Value = (Probabilite modelee * cote) - 1
    return (model_probability * odds) - 1.0


def kelly_fraction_full(model_probability: float, odds: float) -> float:
    if odds <= 1:
        return 0.0
    b = odds - 1.0
    p = model_probability
    q = 1.0 - p
    raw = ((b * p) - q) / b
    return max(0.0, raw)


def evaluate_event(event: EventInput, risk: RiskInput) -> ValueOpportunity | None:
    if not event.quotes:
        return None

    best_quote = max(event.quotes, key=lambda quote: quote.odds)
    if best_quote.odds <= 1:
        return None

    model_probability = max(0.0, min(1.0, event.model_win_probability))
    imp = implied_probability(best_quote.odds)
    edge = model_probability - imp
    val = value_score(model_probability, best_quote.odds)

    if val <= 0 or edge < risk.min_edge:
        return ValueOpportunity(
            event_id=event.event_id,
            event_label=event.event_label,
            sport=event.sport,
            bookmaker=best_quote.bookmaker,
            best_odds=best_quote.odds,
            model_probability=model_probability,
            implied_probability=imp,
            edge_probability=edge,
            value_score=val,
            stake_eur=0.0,
            stake_pct_bankroll=0.0,
            decision="skip",
        )

    full_kelly = kelly_fraction_full(model_probability, best_quote.odds)
    fraction = full_kelly * max(0.0, min(1.0, risk.kelly_fraction))
    bounded_fraction = min(fraction, max(0.0, risk.max_stake_pct_per_bet))

    stake = risk.bankroll_eur * bounded_fraction
    if risk.max_stake_eur is not None:
        stake = min(stake, max(0.0, risk.max_stake_eur))

    stake = max(0.0, stake)
    decision = "bet" if stake > 0 else "skip"

    return ValueOpportunity(
        event_id=event.event_id,
        event_label=event.event_label,
        sport=event.sport,
        bookmaker=best_quote.bookmaker,
        best_odds=best_quote.odds,
        model_probability=model_probability,
        implied_probability=imp,
        edge_probability=edge,
        value_score=val,
        stake_eur=stake,
        stake_pct_bankroll=bounded_fraction,
        decision=decision,
    )


def scan_value_opportunities(events: list[EventInput], risk: RiskInput) -> list[ValueOpportunity]:
    results: list[ValueOpportunity] = []
    for event in events:
        decision = evaluate_event(event, risk)
        if decision is not None:
            results.append(decision)
    results.sort(key=lambda row: row.value_score, reverse=True)
    return results


def decimal_round(value: float, precision: str = "0.0001") -> float:
    return float(Decimal(str(value)).quantize(Decimal(precision)))
