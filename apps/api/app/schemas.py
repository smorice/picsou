from decimal import Decimal
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
    is_active: bool
    mfa_enabled: bool
    personal_settings: dict


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=14, max_length=128)
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
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetResponse(BaseModel):
    message: str
    reset_token: str | None = None


class PasswordResetConfirmRequest(BaseModel):
    reset_token: str
    new_password: str = Field(min_length=14, max_length=128)


class MfaSetupRequest(BaseModel):
    method: Literal["email", "totp"] = "email"


class MfaSetupResponse(BaseModel):
    method: Literal["email", "totp"]
    secret: str | None = None
    otpauth_uri: str | None = None
    delivery_hint: str | None = None
    preview_code: str | None = None


class MfaVerifyRequest(BaseModel):
    code: str = Field(min_length=6, max_length=8)


class MfaVerifyResponse(BaseModel):
    enabled: bool
    recovery_codes: list[str]


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


class BankIntegrationToggleResponse(BaseModel):
    connection_id: str
    provider_code: str
    status: str


class UserSettingsUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone_number: str | None = Field(default=None, max_length=32)
    client_context: ClientContext | None = None
    personal_settings: dict = Field(default_factory=dict)


class IntegrationCredentialRequest(BaseModel):
    provider_code: str
    account_label: str | None = Field(default=None, max_length=255)
    api_key: str | None = None
    api_secret: str | None = None
    external_portfolio_id: str | None = Field(default=None, max_length=128)


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


class AdminUserUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    assigned_roles: list[str] | None = None
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
