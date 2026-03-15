from decimal import Decimal
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class ClientContext(BaseModel):
    locale: str | None = Field(default=None, max_length=32)
    time_zone: str | None = Field(default=None, max_length=64)
    country: str | None = Field(default=None, max_length=64)


class UserProfileResponse(BaseModel):
    id: str
    email: EmailStr
    phone_number: str | None = None
    full_name: str
    role: str
    assigned_roles: list[str]
    access_profile: Literal["read", "write", "admin"]
    app_access: list[Literal["finance", "betting", "loto"]]
    birth_date: date | None = None
    last_login_at: datetime | None = None
    is_verified: bool
    is_active: bool
    mfa_enabled: bool
    personal_settings: dict


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=14, max_length=128)
    birth_date: date | None = None
    access_profile: Literal["read", "write", "admin"] = "write"
    app_access: list[Literal["finance", "betting", "loto"]] = Field(default_factory=lambda: ["finance", "betting", "loto"])
    verification_channel: Literal["email", "sms"] = "email"
    personal_settings: dict = Field(default_factory=dict)
    client_context: ClientContext | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=14, max_length=128)
    mfa_code: str | None = Field(default=None, min_length=6, max_length=8)
    recovery_code: str | None = Field(default=None, min_length=8, max_length=32)
    client_context: ClientContext | None = None


class TokenResponse(BaseModel):
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str = "bearer"
    expires_in: int | None = None
    mfa_required: bool = False
    mfa_method: str | None = None
    mfa_delivery_hint: str | None = None
    mfa_preview_code: str | None = None
    user: UserProfileResponse | None = None


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetResponse(BaseModel):
    message: str
    reset_token: str | None = None


class PasswordResetConfirmRequest(BaseModel):
    reset_token: str
    new_password: str = Field(min_length=14, max_length=128)


class MfaSetupRequest(BaseModel):
    method: Literal["email", "totp", "sms", "whatsapp", "google_chat"] = "email"


class MfaSetupResponse(BaseModel):
    method: Literal["email", "totp", "sms", "whatsapp", "google_chat"]
    secret: str | None = None
    otpauth_uri: str | None = None
    delivery_hint: str | None = None
    preview_code: str | None = None


class MfaVerifyRequest(BaseModel):
    code: str = Field(min_length=6, max_length=8)


class MfaVerifyResponse(BaseModel):
    enabled: bool
    recovery_codes: list[str]


class MfaChallengeRequest(BaseModel):
    purpose: Literal["sensitive"] = "sensitive"


class MfaChallengeResponse(BaseModel):
    method: Literal["email", "totp", "sms", "whatsapp", "google_chat"]
    delivery_hint: str
    preview_code: str | None = None


class BankProvider(BaseModel):
    code: str
    name: str
    category: str
    supports_securities: bool
    supports_crypto: bool
    supports_cash: bool
    status: str
    onboarding_hint: str


class BankConnectionRequest(BaseModel):
    provider_code: str
    account_label: str | None = Field(default=None, max_length=255)


class BankConnectionResponse(BaseModel):
    connection_id: str
    provider_code: str
    status: str


class BankIntegrationToggleRequest(BaseModel):
    provider_code: str
    enabled: bool
    account_label: str | None = Field(default=None, max_length=255)
    mfa_code: str | None = Field(default=None, min_length=6, max_length=8)


class BankIntegrationToggleResponse(BaseModel):
    connection_id: str
    provider_code: str
    status: str


class UserSettingsUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone_number: str | None = Field(default=None, max_length=32)
    client_context: ClientContext | None = None
    personal_settings: dict = Field(default_factory=dict)


class CommunicationTestRequest(BaseModel):
    channel: Literal["email", "sms", "whatsapp", "google_chat", "telegram", "push"]
    phone_number: str | None = Field(default=None, max_length=32)
    google_chat_webhook: str | None = None
    telegram_bot_token: str | None = None
    telegram_chat_id: str | None = None


class CommunicationTestResponse(BaseModel):
    channel: Literal["email", "sms", "whatsapp", "google_chat", "telegram", "push"]
    status: Literal["ok", "error"]
    message: str


class IntegrationCredentialRequest(BaseModel):
    provider_code: str
    account_label: str | None = Field(default=None, max_length=255)
    api_token: str | None = None
    api_key: str | None = None
    api_secret: str | None = None
    external_portfolio_id: str | None = Field(default=None, max_length=128)
    mfa_code: str | None = Field(default=None, min_length=6, max_length=8)


class IntegrationConnectionResponse(BaseModel):
    connection_id: str
    provider_code: str
    provider_name: str
    status: str
    account_label: str | None = None
    has_credentials: bool
    supports_read: bool
    supports_trade: bool
    last_sync_status: str | None = None
    last_sync_error: str | None = None
    last_sync_at: str | None = None
    last_snapshot_total_value: Decimal | None = None
    positions_count: int = 0


class IntegrationSyncResponse(BaseModel):
    provider_code: str
    status: str
    positions_synced: int
    total_value: Decimal | None = None
    synced_at: str | None = None
    message: str


class IntegrationSyncRequest(BaseModel):
    mfa_code: str | None = Field(default=None, min_length=6, max_length=8)


class IntegrationBulkSyncResponse(BaseModel):
    synced: int
    skipped: int
    failed: int
    summaries: list[dict]


class VirtualPortfolioResponse(BaseModel):
    portfolio_id: str
    label: str
    budget_initial: Decimal
    current_value: Decimal
    pnl: Decimal
    roi: float
    history_points: list[dict]
    strategy_mix: list[dict]
    latest_actions: list[dict]
    agent_name: str


class AdminUserUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    assigned_roles: list[str] | None = None
    access_profile: Literal["read", "write", "admin"] | None = None
    app_access: list[Literal["finance", "betting", "loto"]] | None = None
    is_active: bool | None = None
    personal_settings: dict | None = None


class AuditLogResponse(BaseModel):
    id: str
    actor_id: str
    event_type: str
    severity: str
    device_fingerprint: str | None
    ip_address: str | None
    payload: dict
    created_at: str


class DashboardResponse(BaseModel):
    portfolio_id: str
    portfolio_name: str
    total_value: Decimal | None
    cash_balance: Decimal | None
    pnl_realized: Decimal | None
    pnl_unrealized: Decimal | None
    annualized_return: float | None
    rolling_volatility: float | None
    max_drawdown: float | None
    is_empty: bool
    key_indicators: list[dict]
    sector_heatmap: list[dict]
    allocation: list[dict]
    recent_flows: list[dict]
    suggestions: list[dict]
    bank_connectors: list[BankProvider]
    connected_accounts: list[dict]
    portfolios: list[dict]
    virtual_portfolio: VirtualPortfolioResponse
    next_steps: list[str]


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


class BettingOddsQuote(BaseModel):
    bookmaker: str = Field(min_length=1, max_length=120)
    odds: float = Field(gt=1.0)


class BettingEventSnapshot(BaseModel):
    event_id: str = Field(min_length=1, max_length=120)
    event_label: str = Field(min_length=1, max_length=255)
    sport: str = Field(min_length=1, max_length=64)
    model_win_probability: float = Field(ge=0.0, le=1.0)
    quotes: list[BettingOddsQuote] = Field(default_factory=list)


class BettingRiskConfig(BaseModel):
    bankroll_eur: float = Field(gt=0)
    kelly_fraction: float = Field(default=0.35, gt=0, le=1.0)
    min_edge: float = Field(default=0.01, ge=0.0, le=1.0)
    max_stake_pct_per_bet: float = Field(default=0.03, gt=0.0, le=1.0)
    max_stake_eur: float | None = Field(default=None, gt=0)


class BettingValueScanRequest(BaseModel):
    events: list[BettingEventSnapshot] = Field(default_factory=list)
    risk: BettingRiskConfig


class BettingValueOpportunity(BaseModel):
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
    decision: Literal["bet", "skip"]


class BettingValueScanResponse(BaseModel):
    processed_events: int
    bet_candidates: int
    opportunities: list[BettingValueOpportunity]


class BettingLiveOddsFetchRequest(BaseModel):
    sport_key: str = Field(min_length=1, max_length=120)
    regions: str = Field(default="eu", min_length=1, max_length=32)
    markets: str = Field(default="h2h", min_length=1, max_length=64)


class BettingLiveOddsSelection(BaseModel):
    bookmaker: str
    outcome: str
    odds: float


class BettingLiveOddsEvent(BaseModel):
    event_id: str
    sport_key: str
    commence_time: str
    home_team: str
    away_team: str
    selections: list[BettingLiveOddsSelection]


class BettingLiveOddsFetchResponse(BaseModel):
    source: str
    fetched_events: int
    events: list[BettingLiveOddsEvent]


class BettingPoissonRequest(BaseModel):
    home_team: str = Field(min_length=1, max_length=120)
    away_team: str = Field(min_length=1, max_length=120)
    expected_goals_home: float = Field(ge=0.0, le=8.0)
    expected_goals_away: float = Field(ge=0.0, le=8.0)
    max_goals: int = Field(default=8, ge=2, le=14)


class BettingPoissonResponse(BaseModel):
    home_team: str
    away_team: str
    expected_goals_home: float
    expected_goals_away: float
    home_win_probability: float
    draw_probability: float
    away_win_probability: float


class BettingAnalyticsResponse(BaseModel):
    roi_pct: float
    yield_pct: float
    variance: float
    max_drawdown_pct: float
    bets: int
    win_rate_pct: float


class BettingCombinedDecisionRequest(BaseModel):
    sport_key: str = Field(min_length=1, max_length=120)
    home_team: str = Field(min_length=1, max_length=120)
    away_team: str = Field(min_length=1, max_length=120)
    expected_goals_home: float = Field(ge=0.0, le=8.0)
    expected_goals_away: float = Field(ge=0.0, le=8.0)
    bankroll_eur: float = Field(gt=0)
    kelly_fraction: float = Field(default=0.35, gt=0, le=1.0)
    min_edge: float = Field(default=0.01, ge=0.0, le=1.0)
    max_stake_pct_per_bet: float = Field(default=0.03, gt=0.0, le=1.0)
    max_stake_eur: float | None = Field(default=None, gt=0)
    regions: str = Field(default="eu", min_length=1, max_length=32)
    markets: str = Field(default="h2h", min_length=1, max_length=64)


class BettingCombinedDecisionResponse(BaseModel):
    source: str
    matched_event_id: str | None = None
    event_label: str
    model_home_win_probability: float
    best_bookmaker: str | None = None
    best_odds: float | None = None
    implied_probability: float | None = None
    edge_probability: float | None = None
    value_score: float | None = None
    stake_eur: float | None = None
    stake_pct_bankroll: float | None = None
    decision: Literal["bet", "skip"]
    cache_hit: bool


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
    mfa_code: str | None = Field(default=None, min_length=6, max_length=8)
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


class AccountVerificationRequest(BaseModel):
    email: EmailStr
    channel: Literal["email", "sms"] = "email"


class AccountVerificationConfirmRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=8)


class AccountVerificationResponse(BaseModel):
    message: str
    channel: Literal["email", "sms"]
    preview_code: str | None = None


class VirtualPortfolioResetResponse(BaseModel):
    portfolio_id: str
    current_value: Decimal
    transaction_count: int
    message: str
