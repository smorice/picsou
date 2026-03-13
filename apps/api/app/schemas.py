from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class DashboardResponse(BaseModel):
    portfolio_id: str
    total_value: Decimal
    pnl_realized: Decimal
    pnl_unrealized: Decimal
    annualized_return: float
    rolling_volatility: float
    max_drawdown: float
    sector_heatmap: list[dict]
    allocation: list[dict]
    recent_flows: list[dict]
    suggestions: list[dict]


class RecommendationRequest(BaseModel):
    portfolio_id: str
    risk_profile: Literal["prudent", "neutral", "offensive"] = "neutral"
    prices: list[float] = Field(default_factory=list)
    implied_volatility: float = 0.18
    inflation: float = 0.02
    rates: float = 0.025
    sentiment_score: float = 0.0
    fundamentals: dict = Field(default_factory=dict)


class RecommendationResponse(BaseModel):
    action: Literal["buy", "sell", "rebalance", "hold"]
    confidence: int = Field(ge=0, le=100)
    risk_level: Literal["low", "medium", "high"]
    horizon: Literal["short", "medium", "long"]
    rationale: str
    approval_required: bool
    agents: dict


class TradeProposalRequest(BaseModel):
    portfolio_id: str
    asset_symbol: str
    side: Literal["buy", "sell"]
    quantity: Decimal = Field(gt=0)
    order_type: Literal["market", "limit"] = "market"
    rationale: str
    actor_id: str = "demo-user"


class TradeProposalResponse(BaseModel):
    proposal_id: str
    status: str
    approval_required: bool


class TradeApprovalRequest(BaseModel):
    proposal_id: str
    approved: bool
    actor_id: str = "demo-user"
    device_fingerprint: str | None = None
    ip_address: str | None = None


class KillSwitchRequest(BaseModel):
    actor_id: str = "demo-user"
    reason: str


class TaxEstimateRequest(BaseModel):
    realized_gains: Decimal = Decimal("0")
    realized_losses: Decimal = Decimal("0")
    flat_tax_rate: Decimal = Decimal("0.30")


class TaxEstimateResponse(BaseModel):
    taxable_base: Decimal
    estimated_tax: Decimal
    regime: str
