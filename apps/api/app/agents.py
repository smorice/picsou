from dataclasses import asdict, dataclass

from .schemas import RecommendationRequest


@dataclass
class MarketAnalysis:
    attractiveness_score: int
    trend_regime: str
    volatility_bucket: str
    timing_commentary: str


@dataclass
class FundamentalAnalysis:
    fundamental_score: int
    valuation_label: str
    quality_score: int
    long_term_conviction: int


@dataclass
class SentimentAnalysis:
    sentiment_score: int
    event_risk_level: str
    headline_summary: str


@dataclass
class RiskAnalysis:
    portfolio_risk_score: int
    stress_loss_estimate: float
    rebalancing_actions: list[str]
    risk_budget_usage: float


@dataclass
class AllocationAnalysis:
    target_weights: dict[str, float]
    expected_return: float
    expected_volatility: float


@dataclass
class DecisionBundle:
    attractiveness_score: int
    trend_regime: str
    volatility_bucket: str
    timing_commentary: str
    fundamental_score: int
    valuation_label: str
    quality_score: int
    long_term_conviction: int
    sentiment_score: int
    event_risk_level: str
    headline_summary: str
    portfolio_risk_score: int
    stress_loss_estimate: float
    rebalancing_actions: list[str]
    risk_budget_usage: float
    target_weights: dict[str, float]
    expected_return: float
    expected_volatility: float

    def to_dict(self) -> dict:
        return asdict(self)


def analyze_market(payload: RecommendationRequest) -> MarketAnalysis:
    prices = payload.prices or [100.0, 101.5, 102.2, 103.8, 102.9]
    momentum = ((prices[-1] - prices[0]) / prices[0]) if len(prices) > 1 else 0.0
    attractiveness_score = max(10, min(95, int(55 + momentum * 180 - payload.implied_volatility * 40)))
    trend_regime = "bullish" if momentum > 0.03 else "neutral" if momentum > -0.03 else "bearish"
    volatility_bucket = "high" if payload.implied_volatility > 0.30 else "medium" if payload.implied_volatility > 0.18 else "low"
    timing_commentary = "Momentum remains positive but entries should stay phased." if momentum >= 0 else "Volatility argues for staggered entries and tighter rebalancing thresholds."
    return MarketAnalysis(
        attractiveness_score=attractiveness_score,
        trend_regime=trend_regime,
        volatility_bucket=volatility_bucket,
        timing_commentary=timing_commentary,
    )


def analyze_fundamentals(payload: RecommendationRequest) -> FundamentalAnalysis:
    fundamental_growth = float(payload.fundamentals.get("revenue_growth", 0.08))
    leverage = float(payload.fundamentals.get("net_debt_to_ebitda", 1.2))
    free_cash_flow = float(payload.fundamentals.get("free_cash_flow_margin", 0.12))
    fundamental_score = max(15, min(95, int(50 + fundamental_growth * 200 + free_cash_flow * 100 - leverage * 8)))
    valuation_label = "cheap" if fundamental_score > 70 and payload.rates < 0.035 else "fair" if fundamental_score > 45 else "expensive"
    quality_score = max(20, min(95, int(45 + free_cash_flow * 180 - leverage * 5)))
    long_term_conviction = int((fundamental_score + quality_score) / 2)
    return FundamentalAnalysis(
        fundamental_score=fundamental_score,
        valuation_label=valuation_label,
        quality_score=quality_score,
        long_term_conviction=long_term_conviction,
    )


def analyze_sentiment(payload: RecommendationRequest) -> SentimentAnalysis:
    sentiment_score = max(0, min(100, int(50 + payload.sentiment_score * 35)))
    event_risk_level = "high" if abs(payload.sentiment_score) > 0.8 else "medium" if abs(payload.sentiment_score) > 0.35 else "low"
    headline_summary = (
        "Macro sentiment constructive with controlled inflation pressure."
        if payload.sentiment_score >= 0
        else "Headline flow remains cautious and supports tighter risk budgets."
    )
    return SentimentAnalysis(
        sentiment_score=sentiment_score,
        event_risk_level=event_risk_level,
        headline_summary=headline_summary,
    )


def analyze_risk(payload: RecommendationRequest) -> RiskAnalysis:
    portfolio_risk_score = max(10, min(95, int(35 + payload.implied_volatility * 120 + abs(payload.sentiment_score) * 15)))
    stress_loss_estimate = round(0.06 + payload.implied_volatility * 0.9, 4)
    rebalancing_actions = [
        "Cap crypto exposure below 10%",
        "Maintain 12 months of liquidity runway",
    ]
    risk_budget_usage = round(min(1.0, portfolio_risk_score / 100), 2)
    return RiskAnalysis(
        portfolio_risk_score=portfolio_risk_score,
        stress_loss_estimate=stress_loss_estimate,
        rebalancing_actions=rebalancing_actions,
        risk_budget_usage=risk_budget_usage,
    )


def analyze_allocation(payload: RecommendationRequest, attractiveness_score: int, conviction: int, portfolio_risk_score: int) -> AllocationAnalysis:
    target_weights = {
        "equities": 0.55 if payload.risk_profile == "neutral" else 0.40 if payload.risk_profile == "prudent" else 0.70,
        "etfs": 0.25,
        "crypto": 0.05 if payload.risk_profile == "prudent" else 0.10,
        "cash": 0.15 if payload.risk_profile != "offensive" else 0.05,
    }
    expected_return = round(0.04 + attractiveness_score / 1000 + conviction / 2500, 4)
    expected_volatility = round(0.07 + portfolio_risk_score / 800, 4)
    return AllocationAnalysis(
        target_weights=target_weights,
        expected_return=expected_return,
        expected_volatility=expected_volatility,
    )


def build_agent_bundle(payload: RecommendationRequest) -> DecisionBundle:
    market = analyze_market(payload)
    fundamentals = analyze_fundamentals(payload)
    sentiment = analyze_sentiment(payload)
    risk = analyze_risk(payload)
    allocation = analyze_allocation(
        payload,
        attractiveness_score=market.attractiveness_score,
        conviction=fundamentals.long_term_conviction,
        portfolio_risk_score=risk.portfolio_risk_score,
    )
    return DecisionBundle(
        attractiveness_score=market.attractiveness_score,
        trend_regime=market.trend_regime,
        volatility_bucket=market.volatility_bucket,
        timing_commentary=market.timing_commentary,
        fundamental_score=fundamentals.fundamental_score,
        valuation_label=fundamentals.valuation_label,
        quality_score=fundamentals.quality_score,
        long_term_conviction=fundamentals.long_term_conviction,
        sentiment_score=sentiment.sentiment_score,
        event_risk_level=sentiment.event_risk_level,
        headline_summary=sentiment.headline_summary,
        portfolio_risk_score=risk.portfolio_risk_score,
        stress_loss_estimate=risk.stress_loss_estimate,
        rebalancing_actions=risk.rebalancing_actions,
        risk_budget_usage=risk.risk_budget_usage,
        target_weights=allocation.target_weights,
        expected_return=allocation.expected_return,
        expected_volatility=allocation.expected_volatility,
    )