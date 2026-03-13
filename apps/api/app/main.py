from contextlib import asynccontextmanager
from dataclasses import asdict, dataclass
from datetime import datetime
from decimal import Decimal

import orjson
from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import ORJSONResponse
from redis import Redis
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .database import Base, SessionLocal, engine, get_db
from .models import AgentDecision, AuditLog, KillSwitchEvent, Portfolio, TradeProposal
from .schemas import (
    DashboardResponse,
    KillSwitchRequest,
    RecommendationRequest,
    RecommendationResponse,
    TaxEstimateRequest,
    TaxEstimateResponse,
    TradeApprovalRequest,
    TradeProposalRequest,
    TradeProposalResponse,
)

redis_client = Redis.from_url(settings.redis_url, decode_responses=True)


@dataclass
class AgentBundle:
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


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_portfolio(db)
    yield


app = FastAPI(title=settings.app_name, default_response_class=ORJSONResponse, lifespan=lifespan)


def seed_demo_portfolio(db: Session) -> None:
    existing = db.scalar(select(Portfolio).limit(1))
    if existing:
        return
    demo = Portfolio(owner_id="demo-user", total_value=Decimal("125430.55"))
    db.add(demo)
    db.commit()


def compute_agents(payload: RecommendationRequest) -> AgentBundle:
    prices = payload.prices or [100.0, 101.5, 102.2, 103.8, 102.9]
    momentum = ((prices[-1] - prices[0]) / prices[0]) if len(prices) > 1 else 0.0
    attractiveness_score = max(10, min(95, int(55 + momentum * 180 - payload.implied_volatility * 40)))
    trend_regime = "bullish" if momentum > 0.03 else "neutral" if momentum > -0.03 else "bearish"
    volatility_bucket = "high" if payload.implied_volatility > 0.30 else "medium" if payload.implied_volatility > 0.18 else "low"

    fundamental_growth = float(payload.fundamentals.get("revenue_growth", 0.08))
    leverage = float(payload.fundamentals.get("net_debt_to_ebitda", 1.2))
    free_cash_flow = float(payload.fundamentals.get("free_cash_flow_margin", 0.12))
    fundamental_score = max(15, min(95, int(50 + fundamental_growth * 200 + free_cash_flow * 100 - leverage * 8)))
    valuation_label = "cheap" if fundamental_score > 70 and payload.rates < 0.035 else "fair" if fundamental_score > 45 else "expensive"
    quality_score = max(20, min(95, int(45 + free_cash_flow * 180 - leverage * 5)))
    long_term_conviction = int((fundamental_score + quality_score) / 2)

    sentiment_score = max(0, min(100, int(50 + payload.sentiment_score * 35)))
    event_risk_level = "high" if abs(payload.sentiment_score) > 0.8 else "medium" if abs(payload.sentiment_score) > 0.35 else "low"
    headline_summary = "Macro sentiment constructive with controlled inflation pressure." if payload.sentiment_score >= 0 else "Headline flow remains cautious and supports tighter risk budgets."

    portfolio_risk_score = max(10, min(95, int(35 + payload.implied_volatility * 120 + abs(payload.sentiment_score) * 15)))
    stress_loss_estimate = round(0.06 + payload.implied_volatility * 0.9, 4)
    rebalancing_actions = [
        "Cap crypto exposure below 10%",
        "Maintain 12 months of liquidity runway",
    ]
    risk_budget_usage = round(min(1.0, portfolio_risk_score / 100), 2)

    target_weights = {
        "equities": 0.55 if payload.risk_profile == "neutral" else 0.40 if payload.risk_profile == "prudent" else 0.70,
        "etfs": 0.25,
        "crypto": 0.05 if payload.risk_profile == "prudent" else 0.10,
        "cash": 0.15 if payload.risk_profile != "offensive" else 0.05,
    }
    expected_return = round(0.04 + attractiveness_score / 1000 + long_term_conviction / 2500, 4)
    expected_volatility = round(0.07 + portfolio_risk_score / 800, 4)

    return AgentBundle(
        attractiveness_score=attractiveness_score,
        trend_regime=trend_regime,
        volatility_bucket=volatility_bucket,
        timing_commentary="Momentum remains positive but entries should stay phased.",
        fundamental_score=fundamental_score,
        valuation_label=valuation_label,
        quality_score=quality_score,
        long_term_conviction=long_term_conviction,
        sentiment_score=sentiment_score,
        event_risk_level=event_risk_level,
        headline_summary=headline_summary,
        portfolio_risk_score=portfolio_risk_score,
        stress_loss_estimate=stress_loss_estimate,
        rebalancing_actions=rebalancing_actions,
        risk_budget_usage=risk_budget_usage,
        target_weights=target_weights,
        expected_return=expected_return,
        expected_volatility=expected_volatility,
    )


def write_audit_log(db: Session, actor_id: str, event_type: str, payload: dict, device_fingerprint: str | None = None, ip_address: str | None = None) -> None:
    db.add(
        AuditLog(
            actor_id=actor_id,
            event_type=event_type,
            payload=payload,
            device_fingerprint=device_fingerprint,
            ip_address=ip_address,
        )
    )
    db.commit()


def is_kill_switch_active(db: Session) -> bool:
    last_event = db.scalar(select(KillSwitchEvent).order_by(KillSwitchEvent.created_at.desc()).limit(1))
    if not last_event:
        return settings.kill_switch_default
    return last_event.activated


@app.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    db.execute(select(Portfolio).limit(1))
    redis_ok = bool(redis_client.ping())
    return {
        "status": "ok",
        "environment": settings.environment,
        "postgres": "ok",
        "redis": "ok" if redis_ok else "down",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/api/v1/dashboard/{portfolio_id}", response_model=DashboardResponse)
def dashboard(portfolio_id: str, db: Session = Depends(get_db)) -> DashboardResponse:
    portfolio = db.get(Portfolio, portfolio_id) or db.scalar(select(Portfolio).limit(1))
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    suggestions = [
        {
            "title": "Renforcer ETF monde",
            "score": 78,
            "justification": "Diversification améliorée avec volatilité contenue.",
        },
        {
            "title": "Réduire surpoids crypto",
            "score": 71,
            "justification": "Budget de risque consommé trop vite dans le scénario prudent.",
        },
    ]
    return DashboardResponse(
        portfolio_id=portfolio.id,
        total_value=portfolio.total_value,
        pnl_realized=Decimal("4120.50"),
        pnl_unrealized=Decimal("7830.35"),
        annualized_return=0.084,
        rolling_volatility=0.118,
        max_drawdown=-0.092,
        sector_heatmap=[
            {"sector": "Tech", "weight": 0.24, "pnl": 0.14},
            {"sector": "Healthcare", "weight": 0.16, "pnl": 0.06},
            {"sector": "Energy", "weight": 0.08, "pnl": -0.01},
        ],
        allocation=[
            {"class": "Actions", "weight": 0.46},
            {"class": "ETF", "weight": 0.29},
            {"class": "Crypto", "weight": 0.09},
            {"class": "Cash", "weight": 0.16},
        ],
        recent_flows=[
            {"date": "2026-03-10", "type": "deposit", "amount": 1500},
            {"date": "2026-03-08", "type": "buy", "amount": -850},
        ],
        suggestions=suggestions,
    )


@app.post("/api/v1/recommendations", response_model=RecommendationResponse)
def recommendations(payload: RecommendationRequest, db: Session = Depends(get_db)) -> RecommendationResponse:
    if is_kill_switch_active(db):
        raise HTTPException(status_code=423, detail="Kill switch active")

    agents = compute_agents(payload)
    action = "rebalance" if agents.portfolio_risk_score > 65 else "buy" if agents.attractiveness_score > 68 else "hold"
    confidence = int((agents.attractiveness_score + agents.fundamental_score + agents.sentiment_score) / 3)
    risk_level = "high" if agents.portfolio_risk_score > 72 else "medium" if agents.portfolio_risk_score > 45 else "low"
    rationale = (
        f"Trend {agents.trend_regime}, valuation {agents.valuation_label}, "
        f"risk budget usage {agents.risk_budget_usage:.2f}."
    )
    approval_required = action != "hold"

    decision = AgentDecision(
        portfolio_id=payload.portfolio_id,
        action=action,
        confidence=confidence,
        risk_level=risk_level,
        horizon="long",
        rationale=rationale,
        inputs=orjson.loads(orjson.dumps(payload.model_dump(mode="json"))),
    )
    db.add(decision)
    db.commit()

    response = RecommendationResponse(
        action=action,
        confidence=confidence,
        risk_level=risk_level,
        horizon="long",
        rationale=rationale,
        approval_required=approval_required,
        agents=asdict(agents),
    )
    write_audit_log(db, "system", "recommendation.generated", response.model_dump())
    return response


@app.post("/api/v1/orders/propose", response_model=TradeProposalResponse)
def propose_order(payload: TradeProposalRequest, db: Session = Depends(get_db)) -> TradeProposalResponse:
    if is_kill_switch_active(db):
        raise HTTPException(status_code=423, detail="Kill switch active")

    proposal = TradeProposal(
        portfolio_id=payload.portfolio_id,
        asset_symbol=payload.asset_symbol.upper(),
        side=payload.side,
        quantity=payload.quantity,
        order_type=payload.order_type,
        rationale=payload.rationale,
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)

    write_audit_log(db, payload.actor_id, "trade.proposed", {"proposal_id": proposal.id, "asset": proposal.asset_symbol})
    return TradeProposalResponse(proposal_id=proposal.id, status=proposal.status, approval_required=True)


@app.post("/api/v1/orders/approve")
def approve_order(payload: TradeApprovalRequest, db: Session = Depends(get_db)) -> dict:
    proposal = db.get(TradeProposal, payload.proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    proposal.status = "approved" if payload.approved else "rejected"
    db.add(proposal)
    db.commit()

    write_audit_log(
        db,
        payload.actor_id,
        "trade.approval",
        {"proposal_id": proposal.id, "approved": payload.approved},
        device_fingerprint=payload.device_fingerprint,
        ip_address=payload.ip_address,
    )
    return {"proposal_id": proposal.id, "status": proposal.status}


@app.post("/api/v1/kill-switch/activate")
def activate_kill_switch(payload: KillSwitchRequest, db: Session = Depends(get_db)) -> dict:
    event = KillSwitchEvent(activated=True, reason=payload.reason, actor_id=payload.actor_id)
    db.add(event)
    db.commit()
    write_audit_log(db, payload.actor_id, "kill_switch.activated", {"reason": payload.reason})
    redis_client.set("kill_switch", "true")
    return {"active": True, "reason": payload.reason}


@app.post("/api/v1/kill-switch/release")
def release_kill_switch(payload: KillSwitchRequest, db: Session = Depends(get_db)) -> dict:
    event = KillSwitchEvent(activated=False, reason=payload.reason, actor_id=payload.actor_id)
    db.add(event)
    db.commit()
    write_audit_log(db, payload.actor_id, "kill_switch.released", {"reason": payload.reason})
    redis_client.set("kill_switch", "false")
    return {"active": False, "reason": payload.reason}


@app.get("/api/v1/opportunities")
def opportunities() -> dict:
    return {
        "opportunities": [
            {
                "asset": "CW8",
                "score": 81,
                "theme": "Diversification globale",
                "risk": "medium",
            },
            {
                "asset": "EUNL",
                "score": 76,
                "theme": "Exposition coeur de portefeuille",
                "risk": "medium",
            },
        ]
    }


@app.post("/api/v1/tax/estimate", response_model=TaxEstimateResponse)
def estimate_tax(payload: TaxEstimateRequest) -> TaxEstimateResponse:
    taxable_base = max(Decimal("0"), payload.realized_gains - payload.realized_losses)
    estimated_tax = taxable_base * payload.flat_tax_rate
    return TaxEstimateResponse(
        taxable_base=taxable_base,
        estimated_tax=estimated_tax.quantize(Decimal("0.01")),
        regime="PFU 30%",
    )
