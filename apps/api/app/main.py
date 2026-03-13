from contextlib import asynccontextmanager
from dataclasses import asdict
from datetime import datetime, timedelta
from decimal import Decimal
import logging
import secrets

import orjson
import httpx
import jwt
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import ORJSONResponse, RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis import Redis
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from .agents import build_agent_bundle
from .auth import (
    build_totp_uri,
    consume_password_reset_token,
    consume_recovery_code,
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_access_token,
    decrypt_secret,
    encrypt_secret,
    generate_recovery_codes,
    generate_totp_secret,
    hash_password,
    revoke_refresh_token,
    rotate_refresh_token,
    validate_password_strength,
    verify_password,
    verify_totp,
)
from .coinbase_connector import sync_coinbase_read_only
from .config import settings
from .database import Base, SessionLocal, engine, get_db
from .emailing import send_password_reset_email
from .models import AgentDecision, AuditLog, BrokerConnection, IntegrationPosition, IntegrationSyncEvent, KillSwitchEvent, MfaDevice, OAuthIdentity, Portfolio, TradeProposal, User
from .schemas import (
    BankIntegrationToggleRequest,
    BankIntegrationToggleResponse,
    BankConnectionRequest,
    BankConnectionResponse,
    BankProvider,
    DashboardResponse,
    IntegrationConnectionResponse,
    IntegrationCredentialRequest,
    IntegrationSyncResponse,
    KillSwitchRequest,
    LoginRequest,
    LogoutRequest,
    MfaSetupResponse,
    MfaVerifyRequest,
    MfaVerifyResponse,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    PasswordResetResponse,
    RecommendationRequest,
    RecommendationResponse,
    RefreshRequest,
    RegisterRequest,
    AdminUserUpdateRequest,
    TaxEstimateRequest,
    TaxEstimateResponse,
    TokenResponse,
    TradeApprovalRequest,
    TradeProposalRequest,
    TradeProposalResponse,
    UserSettingsUpdateRequest,
    UserProfileResponse,
    AuditLogResponse,
)

redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
security = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        ensure_runtime_schema(db)
        seed_security_data(db)
    yield


app = FastAPI(title=settings.app_name, default_response_class=ORJSONResponse, lifespan=lifespan)

SUPPORTED_BANK_PROVIDERS = [
    {
        "code": "revolut",
        "name": "Revolut",
        "category": "neobank",
        "supports_securities": True,
        "supports_crypto": True,
        "supports_cash": True,
        "onboarding_hint": "Connexion API pour alimenter le portefeuille et proposer des transactions sous validation.",
    },
    {
        "code": "boursobank",
        "name": "Boursorama",
        "category": "broker-bank",
        "supports_securities": True,
        "supports_crypto": False,
        "supports_cash": True,
        "onboarding_hint": "Compte titres et liquidites pilotables depuis un cockpit unique.",
    },
    {
        "code": "coinbase",
        "name": "Coinbase",
        "category": "crypto-exchange",
        "supports_securities": False,
        "supports_crypto": True,
        "supports_cash": True,
        "onboarding_hint": "Suivi des positions crypto avec activation utilisateur depuis l espace securise.",
    },
    {
        "code": "trade_republic",
        "name": "Trade Republic",
        "category": "broker",
        "supports_securities": True,
        "supports_crypto": True,
        "supports_cash": True,
        "onboarding_hint": "Investissement long terme avec execution declenchee uniquement apres validation expresse.",
    },
]

# ---------------------------------------------------------------------------
# OAuth provider configuration
# ---------------------------------------------------------------------------
_OAUTH_PROVIDERS = {
    "google": {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v3/userinfo",
        "scope": "openid email profile",
        "enabled": lambda: bool(settings.google_client_id and settings.google_client_secret),
        "client_id": lambda: settings.google_client_id,
        "client_secret": lambda: settings.google_client_secret,
    },
    "franceconnect": {
        "auth_url": "https://app.franceconnect.gouv.fr/api/v1/authorize",
        "token_url": "https://app.franceconnect.gouv.fr/api/v1/token",
        "userinfo_url": "https://app.franceconnect.gouv.fr/api/v1/userinfo",
        "scope": "openid given_name family_name email",
        "enabled": lambda: bool(settings.franceconnect_client_id and settings.franceconnect_client_secret),
        "client_id": lambda: settings.franceconnect_client_id,
        "client_secret": lambda: settings.franceconnect_client_secret,
    },
}

_OAUTH_STATE_PREFIX = "oauth_state:"


def _oauth_callback_url(provider: str) -> str:
    return f"{settings.public_base_url}/auth/oauth/{provider}/callback"


def normalize_email(email: str) -> str:
    return email.strip().lower()


def normalize_roles(roles: list[str] | None, fallback_role: str = "user") -> list[str]:
    cleaned = []
    for role in roles or [fallback_role]:
        normalized = role.strip().lower()
        if normalized and normalized not in cleaned:
            cleaned.append(normalized)
    if not cleaned:
        cleaned = [fallback_role]
    if any(role not in {"admin", "user", "banned"} for role in cleaned):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unsupported role assignment")
    return cleaned


def primary_role_from_roles(roles: list[str]) -> str:
    if "admin" in roles:
        return "admin"
    if "user" in roles:
        return "user"
    return "banned"


def to_user_profile(user: User) -> UserProfileResponse:
    assigned_roles = normalize_roles(user.assigned_roles or [user.role], user.role)
    return UserProfileResponse(
        id=user.id,
        email=user.email,
        phone_number=user.phone_number,
        full_name=user.full_name,
        role=primary_role_from_roles(assigned_roles),
        assigned_roles=assigned_roles,
        is_active=user.is_active,
        mfa_enabled=user.mfa_enabled,
        personal_settings=user.personal_settings or {},
    )


def ensure_runtime_schema(db: Session) -> None:
    statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(32)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_roles JSON DEFAULT '[]'::json",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_settings JSON DEFAULT '{}'::json",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS severity VARCHAR(16) DEFAULT 'info'",
        "ALTER TABLE broker_connections ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT",
        "ALTER TABLE broker_connections ADD COLUMN IF NOT EXISTS api_secret_encrypted TEXT",
        "ALTER TABLE broker_connections ADD COLUMN IF NOT EXISTS permissions JSON DEFAULT '{}'::json",
        "ALTER TABLE broker_connections ADD COLUMN IF NOT EXISTS provider_metadata JSON DEFAULT '{}'::json",
        "ALTER TABLE broker_connections ADD COLUMN IF NOT EXISTS external_portfolio_id VARCHAR(128)",
        "ALTER TABLE broker_connections ADD COLUMN IF NOT EXISTS external_account_ids JSON DEFAULT '[]'::json",
        "ALTER TABLE broker_connections ADD COLUMN IF NOT EXISTS supports_read BOOLEAN DEFAULT true",
        "ALTER TABLE broker_connections ADD COLUMN IF NOT EXISTS supports_trade BOOLEAN DEFAULT false",
        "ALTER TABLE broker_connections ADD COLUMN IF NOT EXISTS last_sync_status VARCHAR(32)",
        "ALTER TABLE broker_connections ADD COLUMN IF NOT EXISTS last_sync_error TEXT",
        "ALTER TABLE broker_connections ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP",
        "ALTER TABLE broker_connections ADD COLUMN IF NOT EXISTS last_snapshot_total_value NUMERIC(18,2)",
    ]
    for statement in statements:
        db.execute(text(statement))
    db.commit()
    db.execute(text("UPDATE users SET assigned_roles = to_json(ARRAY[role]) WHERE assigned_roles IS NULL OR assigned_roles::text = 'null' OR assigned_roles::text = '[]'"))
    db.commit()


def seed_security_data(db: Session) -> None:
    admin_user: User | None = None
    if settings.bootstrap_admin_email and settings.bootstrap_admin_password:
        admin_user = db.scalar(select(User).where(User.email == normalize_email(settings.bootstrap_admin_email)))
        if not admin_user:
            try:
                validate_password_strength(settings.bootstrap_admin_password)
            except ValueError:
                logger.warning("Skipping bootstrap admin creation because the configured password is invalid")
                admin_user = None
            else:
                admin_user = User(
                    email=normalize_email(settings.bootstrap_admin_email),
                    full_name="Platform Administrator",
                    phone_number=None,
                    password_hash=hash_password(settings.bootstrap_admin_password),
                    role="admin",
                    assigned_roles=["admin", "user"],
                    personal_settings={
                        "dashboard_density": "comfortable",
                        "currency": "EUR",
                        "theme": "family",
                        "notify_email": True,
                        "weekly_digest": True,
                    },
                )
                db.add(admin_user)
                db.commit()
                db.refresh(admin_user)

    portfolio_owner_id = admin_user.id if admin_user else "demo-user"
    portfolio = db.scalar(select(Portfolio).where(Portfolio.owner_id == portfolio_owner_id).limit(1))
    if portfolio:
        return
    db.add(Portfolio(owner_id=portfolio_owner_id, total_value=Decimal("125430.55")))
    db.commit()


def write_audit_log(db: Session, actor_id: str, event_type: str, payload: dict, device_fingerprint: str | None = None, ip_address: str | None = None, severity: str = "info") -> None:
    db.add(
        AuditLog(
            actor_id=actor_id,
            event_type=event_type,
            payload=payload,
            device_fingerprint=device_fingerprint,
            ip_address=ip_address,
            severity=severity,
        )
    )
    db.commit()


def is_kill_switch_active(db: Session) -> bool:
    last_event = db.scalar(select(KillSwitchEvent).order_by(KillSwitchEvent.created_at.desc()).limit(1))
    if not last_event:
        return settings.kill_switch_default
    return last_event.activated


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security), db: Session = Depends(get_db)) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        principal = decode_access_token(credentials.credentials)
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user = db.get(User, principal.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User unavailable")
    assigned_roles = normalize_roles(user.assigned_roles or [user.role], user.role)
    if "banned" in assigned_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account banned")
    return user


def require_mfa_for_sensitive_operation(credentials: HTTPAuthorizationCredentials | None = Depends(security), db: Session = Depends(get_db)) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        principal = decode_access_token(credentials.credentials)
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user = db.get(User, principal.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User unavailable")
    assigned_roles = normalize_roles(user.assigned_roles or [user.role], user.role)
    if "banned" in assigned_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account banned")
    if user.mfa_enabled and not principal.mfa_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="MFA verification required")
    return user


def require_admin_user(current_user: User = Depends(require_mfa_for_sensitive_operation)) -> User:
    assigned_roles = normalize_roles(current_user.assigned_roles or [current_user.role], current_user.role)
    if "admin" not in assigned_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    if not current_user.mfa_enabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin MFA enrollment required")
    return current_user


def primary_mfa_device(db: Session, user_id: str) -> MfaDevice | None:
    return db.scalar(select(MfaDevice).where(MfaDevice.user_id == user_id, MfaDevice.is_primary.is_(True)).limit(1))


def list_bank_providers_for_user(db: Session, user_id: str) -> list[BankProvider]:
    existing_connections = {
        item.provider_code: item.status
        for item in db.scalars(select(BrokerConnection).where(BrokerConnection.user_id == user_id)).all()
    }
    providers: list[BankProvider] = []
    for provider in SUPPORTED_BANK_PROVIDERS:
        providers.append(
            BankProvider(
                **provider,
                status=existing_connections.get(provider["code"], "available"),
            )
        )
    return providers


def serialize_integration_connection(db: Session, connection: BrokerConnection) -> IntegrationConnectionResponse:
    positions_count = len(db.scalars(select(IntegrationPosition).where(IntegrationPosition.connection_id == connection.id)).all())
    return IntegrationConnectionResponse(
        connection_id=connection.id,
        provider_code=connection.provider_code,
        provider_name=connection.provider_name,
        status=connection.status,
        account_label=connection.account_label,
        has_credentials=bool(connection.api_key_encrypted and connection.api_secret_encrypted),
        supports_read=connection.supports_read,
        supports_trade=connection.supports_trade,
        last_sync_status=connection.last_sync_status,
        last_sync_error=connection.last_sync_error,
        last_sync_at=connection.last_sync_at.isoformat() if connection.last_sync_at else None,
        last_snapshot_total_value=connection.last_snapshot_total_value,
        positions_count=positions_count,
    )


def build_dashboard_from_positions(portfolio: Portfolio, bank_connectors: list[BankProvider], connections: list[BrokerConnection], positions: list[IntegrationPosition]) -> DashboardResponse:
    if not positions:
        return DashboardResponse(
            portfolio_id=portfolio.id,
            portfolio_name=portfolio.name,
            total_value=None,
            cash_balance=None,
            pnl_realized=None,
            pnl_unrealized=None,
            annualized_return=None,
            rolling_volatility=None,
            max_drawdown=None,
            is_empty=True,
            key_indicators=[
                {"label": "Valeur totale", "value": "null", "trend": "Synchronisation requise"},
                {"label": "Liquidites", "value": "null", "trend": "Synchronisation requise"},
                {"label": "Transactions ce mois", "value": "null", "trend": "Synchronisation requise"},
                {"label": "Risque actuel", "value": "null", "trend": "Sources insuffisantes"},
            ],
            sector_heatmap=[],
            allocation=[],
            recent_flows=[],
            suggestions=[
                {"title": "Synchroniser vos sources", "score": 96, "justification": "Les integrations actives doivent etre synchronisees pour alimenter le tableau de bord."},
                {"title": "Definir votre profil familial", "score": 78, "justification": "Le niveau de risque et l horizon de placement guideront les prochaines propositions."},
            ],
            bank_connectors=bank_connectors,
            connected_accounts=[
                {
                    "provider_code": connection.provider_code,
                    "provider_name": connection.provider_name,
                    "status": connection.status,
                    "account_label": connection.account_label,
                    "last_sync_status": connection.last_sync_status,
                }
                for connection in connections
            ],
            next_steps=[
                "Configurer puis synchroniser au moins une integration reelle.",
                "Definir votre horizon et votre tolerance au risque.",
                "Activer la MFA avant toute proposition d ordre.",
            ],
        )

    total_value = sum((position.market_value for position in positions), Decimal("0.00"))
    cash_balance = sum((position.market_value for position in positions if position.asset_type == "cash"), Decimal("0.00"))
    asset_groups: dict[str, Decimal] = {}
    for position in positions:
        asset_groups[position.asset_type] = asset_groups.get(position.asset_type, Decimal("0.00")) + position.market_value

    allocation = [
        {"class": asset_type.capitalize(), "weight": float((value / total_value) if total_value > 0 else Decimal("0"))}
        for asset_type, value in sorted(asset_groups.items())
    ]
    sector_heatmap = [
        {"sector": position.symbol, "weight": float((position.market_value / total_value) if total_value > 0 else Decimal("0")), "pnl": 0.0}
        for position in sorted(positions, key=lambda item: item.market_value, reverse=True)[:6]
    ]
    return DashboardResponse(
        portfolio_id=portfolio.id,
        portfolio_name=portfolio.name,
        total_value=total_value.quantize(Decimal("0.01")),
        cash_balance=cash_balance.quantize(Decimal("0.01")),
        pnl_realized=Decimal("0.00"),
        pnl_unrealized=Decimal("0.00"),
        annualized_return=0.0,
        rolling_volatility=0.0,
        max_drawdown=0.0,
        is_empty=False,
        key_indicators=[
            {"label": "Valeur totale", "value": f"{total_value.quantize(Decimal('0.01'))} EUR", "trend": f"{len(positions)} positions"},
            {"label": "Liquidites", "value": f"{cash_balance.quantize(Decimal('0.01'))} EUR", "trend": "Synchronise"},
            {"label": "Sources", "value": str(len([connection for connection in connections if connection.status == 'active'])), "trend": "Actives"},
            {"label": "Risque actuel", "value": "En calcul", "trend": "Base synchronisee"},
        ],
        sector_heatmap=sector_heatmap,
        allocation=allocation,
        recent_flows=[],
        suggestions=[
            {"title": "Verifier la diversification", "score": 77, "justification": "Les positions synchronisees permettent maintenant une premiere lecture de votre allocation."},
            {"title": "Analyser le risque crypto", "score": 72, "justification": "Les poches crypto meritent une validation humaine avant toute execution."},
        ],
        bank_connectors=bank_connectors,
        connected_accounts=[
            {
                "provider_code": connection.provider_code,
                "provider_name": connection.provider_name,
                "status": connection.status,
                "account_label": connection.account_label,
                "last_sync_status": connection.last_sync_status,
            }
            for connection in connections
        ],
        next_steps=[
            "Verifier la coherence entre objectif d epargne et allocation synchronisee.",
            "Lancer une recommandation multi-agents a partir des positions reelles.",
        ],
    )


def run_provider_sync(db: Session, current_user: User, connection: BrokerConnection) -> IntegrationSyncResponse:
    if connection.provider_code != "coinbase":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Read-only sync is currently implemented for Coinbase only")

    result = sync_coinbase_read_only(connection)
    db.query(IntegrationPosition).filter(IntegrationPosition.connection_id == connection.id).delete()
    positions_to_store = []
    for position in result.positions:
        positions_to_store.append(
            IntegrationPosition(
                connection_id=connection.id,
                symbol=position.symbol,
                asset_name=position.asset_name,
                asset_type=position.asset_type,
                quantity=position.quantity,
                market_value=position.market_value,
                currency=position.currency,
                position_metadata=position.metadata,
            )
        )
    for position in positions_to_store:
        db.add(position)

    connection.permissions = result.permissions
    connection.external_portfolio_id = result.external_portfolio_id
    connection.external_account_ids = result.external_account_ids
    connection.last_sync_at = datetime.utcnow()
    connection.last_sync_status = "ok"
    connection.last_sync_error = None
    connection.last_snapshot_total_value = result.total_value
    connection.supports_read = True
    connection.supports_trade = bool(result.permissions.get("can_trade", False))
    db.add(connection)
    db.add(
        IntegrationSyncEvent(
            connection_id=connection.id,
            provider_code=connection.provider_code,
            status="ok",
            positions_synced=len(result.positions),
            total_value=result.total_value,
            details={"external_account_ids": result.external_account_ids},
        )
    )
    db.commit()
    write_audit_log(
        db,
        current_user.id,
        "integration.synced",
        {"provider_code": connection.provider_code, "positions_synced": len(result.positions), "total_value": str(result.total_value)},
    )
    return IntegrationSyncResponse(
        provider_code=connection.provider_code,
        status="ok",
        positions_synced=len(result.positions),
        total_value=result.total_value,
        synced_at=connection.last_sync_at.isoformat() if connection.last_sync_at else None,
        message="Synchronisation Coinbase terminee.",
    )


@app.post("/auth/register", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)) -> UserProfileResponse:
    email = normalize_email(payload.email)
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    try:
        validate_password_strength(payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        phone_number=None,
        password_hash=hash_password(payload.password),
        role="user",
        assigned_roles=["user"],
        personal_settings=payload.personal_settings or {
            "dashboard_density": "comfortable",
            "currency": "EUR",
            "theme": "family",
            "onboarding_style": "coach",
            "notify_email": True,
            "weekly_digest": True,
            "market_alerts": True,
            "communication_frequency": "important_only",
        },
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.add(Portfolio(owner_id=user.id, total_value=Decimal("0")))
    db.commit()
    write_audit_log(db, user.id, "auth.registered", {"email": user.email, "assigned_roles": user.assigned_roles}, ip_address=request.client.host if request.client else None)
    return to_user_profile(user)


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    email = normalize_email(payload.email)
    user = db.scalar(select(User).where(User.email == email))
    request_ip = request.client.host if request.client else None

    if not user or not verify_password(user.password_hash, payload.password):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= settings.max_login_attempts:
                user.locked_until = datetime.utcnow() + timedelta(minutes=settings.login_lockout_minutes)
            db.add(user)
            db.commit()
            write_audit_log(db, user.id, "auth.login_failed", {"email": user.email}, ip_address=request_ip, severity="warning")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail="Account temporarily locked")

    mfa_verified = False
    if user.mfa_enabled:
        device = primary_mfa_device(db, user.id)
        if not device or not device.is_verified:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="MFA device unavailable")

        secret = decrypt_secret(device.secret_encrypted)
        if payload.mfa_code and verify_totp(secret, payload.mfa_code):
            device.last_used_at = datetime.utcnow()
            db.add(device)
            db.commit()
            mfa_verified = True
        else:
            remaining_codes = consume_recovery_code(device.recovery_codes, payload.recovery_code)
            if remaining_codes is None:
                if payload.mfa_code or payload.recovery_code:
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MFA code")
                return TokenResponse(mfa_required=True, user=to_user_profile(user))
            device.recovery_codes = remaining_codes
            device.last_used_at = datetime.utcnow()
            db.add(device)
            db.commit()
            mfa_verified = True

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = datetime.utcnow()
    db.add(user)
    db.commit()

    access_token, expires_in = create_access_token(user.id, user.email, user.role, mfa_verified)
    refresh_token = create_refresh_token(redis_client, user.id, user.email, user.role, mfa_verified)
    write_audit_log(db, user.id, "auth.login_succeeded", {"mfa_verified": mfa_verified}, ip_address=request_ip)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        mfa_required=False,
        user=to_user_profile(user),
    )


@app.post("/auth/refresh", response_model=TokenResponse)
def refresh_tokens(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        new_refresh_token, refresh_payload = rotate_refresh_token(redis_client, payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalid") from exc

    user = db.get(User, refresh_payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User unavailable")

    access_token, expires_in = create_access_token(user.id, user.email, user.role, bool(refresh_payload.get("mfa_verified")))
    write_audit_log(db, user.id, "auth.token_refreshed", {"mfa_verified": bool(refresh_payload.get("mfa_verified"))})
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=expires_in,
        user=to_user_profile(user),
    )


@app.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: LogoutRequest, current_user: User = Depends(get_current_user)) -> None:
    revoke_refresh_token(redis_client, payload.refresh_token)
    with SessionLocal() as db:
        write_audit_log(db, current_user.id, "auth.logout", {})


@app.post("/auth/password-reset/request", response_model=PasswordResetResponse)
def request_password_reset(payload: PasswordResetRequest, request: Request, db: Session = Depends(get_db)) -> PasswordResetResponse:
    email = normalize_email(payload.email)
    user = db.scalar(select(User).where(User.email == email))
    if not user or not user.is_active:
        return PasswordResetResponse(message="Si ce compte existe, un code temporaire de reinitialisation a ete emis.")

    reset_token = create_password_reset_token(redis_client, user.id, user.email)
    email_sent = send_password_reset_email(user.email, reset_token)
    write_audit_log(
        db,
        user.id,
        "auth.password_reset_requested",
        {"email": user.email, "email_sent": email_sent},
        ip_address=request.client.host if request.client else None,
        severity="warning",
    )
    if email_sent:
        return PasswordResetResponse(
            message="Si ce compte existe, un email de reinitialisation a ete envoye avec un lien et un code temporaire.",
        )

    return PasswordResetResponse(
        message="Code temporaire genere. L email n est pas configure sur cette instance, utilisez ce code pour definir un nouveau mot de passe.",
        reset_token=reset_token,
    )


@app.post("/auth/password-reset/confirm", response_model=PasswordResetResponse)
def confirm_password_reset(payload: PasswordResetConfirmRequest, request: Request, db: Session = Depends(get_db)) -> PasswordResetResponse:
    try:
        reset_payload = consume_password_reset_token(redis_client, payload.reset_token)
        validate_password_strength(payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    user = db.get(User, reset_payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User unavailable")

    user.password_hash = hash_password(payload.new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    db.add(user)
    db.commit()
    write_audit_log(
        db,
        user.id,
        "auth.password_reset_completed",
        {"email": user.email},
        ip_address=request.client.host if request.client else None,
        severity="warning",
    )
    return PasswordResetResponse(message="Mot de passe reinitialise. Vous pouvez vous connecter avec le nouveau mot de passe.")


# ---------------------------------------------------------------------------
# OAuth routes (Google, FranceConnect)
# ---------------------------------------------------------------------------

@app.get("/auth/oauth/providers")
def list_oauth_providers():
    """Returns which OAuth providers are configured and available."""
    return [
        {"provider": name, "enabled": cfg["enabled"]()}
        for name, cfg in _OAUTH_PROVIDERS.items()
    ]

@app.get("/auth/oauth/{provider}")
async def oauth_redirect(provider: str, request: Request) -> RedirectResponse:
    """Initiate OAuth flow — redirects the browser to the provider login page."""
    cfg = _OAUTH_PROVIDERS.get(provider)
    if cfg is None:
        raise HTTPException(status_code=404, detail="OAuth provider not found")
    if not cfg["enabled"]():
        raise HTTPException(status_code=503, detail=f"OAuth provider '{provider}' is not configured on this server")

    state = secrets.token_urlsafe(32)
    redis_client.setex(f"{_OAUTH_STATE_PREFIX}{state}", settings.oauth_state_ttl_seconds, provider)

    import urllib.parse
    params = urllib.parse.urlencode({
        "client_id": cfg["client_id"](),
        "redirect_uri": _oauth_callback_url(provider),
        "response_type": "code",
        "scope": cfg["scope"],
        "state": state,
        "prompt": "select_account",
    })
    return RedirectResponse(f"{cfg['auth_url']}?{params}")


@app.get("/auth/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    request: Request,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    """Handle OAuth provider callback, issue JWT tokens, redirect to frontend."""
    cfg = _OAUTH_PROVIDERS.get(provider)
    if cfg is None:
        raise HTTPException(status_code=404, detail="OAuth provider not found")
    if not cfg["enabled"]():
        raise HTTPException(status_code=503, detail=f"OAuth provider '{provider}' is not configured")

    params = dict(request.query_params)
    code = params.get("code")
    state = params.get("state")
    error = params.get("error")

    if error:
        return RedirectResponse(f"{settings.public_base_url}/?oauth_error={error}")

    if not code or not state:
        return RedirectResponse(f"{settings.public_base_url}/?oauth_error=missing_params")

    # Validate CSRF state
    stored_provider = redis_client.get(f"{_OAUTH_STATE_PREFIX}{state}")
    if stored_provider != provider:
        return RedirectResponse(f"{settings.public_base_url}/?oauth_error=invalid_state")
    redis_client.delete(f"{_OAUTH_STATE_PREFIX}{state}")

    # Exchange code for tokens
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            token_resp = await client.post(
                cfg["token_url"],
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": _oauth_callback_url(provider),
                    "client_id": cfg["client_id"](),
                    "client_secret": cfg["client_secret"](),
                },
                headers={"Accept": "application/json"},
            )
            if token_resp.status_code != 200:
                return RedirectResponse(f"{settings.public_base_url}/?oauth_error=token_exchange_failed")

            token_data = token_resp.json()
            access_token_provider = token_data.get("access_token")
            if not access_token_provider:
                return RedirectResponse(f"{settings.public_base_url}/?oauth_error=no_access_token")

            # Fetch userinfo
            userinfo_resp = await client.get(
                cfg["userinfo_url"],
                headers={"Authorization": f"Bearer {access_token_provider}"},
            )
            if userinfo_resp.status_code != 200:
                return RedirectResponse(f"{settings.public_base_url}/?oauth_error=userinfo_failed")

            userinfo = userinfo_resp.json()
    except httpx.RequestError:
        return RedirectResponse(f"{settings.public_base_url}/?oauth_error=provider_unreachable")

    # Extract identity
    provider_sub = str(userinfo.get("sub") or userinfo.get("id") or "")
    email_raw = userinfo.get("email") or ""
    given_name = userinfo.get("given_name") or userinfo.get("family_name") or ""
    family_name = userinfo.get("family_name") or ""
    full_name = f"{given_name} {family_name}".strip() or email_raw.split("@")[0] or "Utilisateur"

    if not provider_sub or not email_raw:
        return RedirectResponse(f"{settings.public_base_url}/?oauth_error=incomplete_profile")

    email_norm = normalize_email(email_raw)

    # Find existing OAuth identity or user
    existing_identity = db.scalar(
        select(OAuthIdentity).where(
            OAuthIdentity.provider == provider,
            OAuthIdentity.provider_sub == provider_sub,
        )
    )

    if existing_identity:
        user = db.scalar(select(User).where(User.id == existing_identity.user_id))
    else:
        # Try to link to existing account with same email
        user = db.scalar(select(User).where(User.email == email_norm))
        if not user:
            # Create new user (no password — OAuth only)
            user = User(
                email=email_norm,
                full_name=full_name,
                password_hash="__oauth__",
                role="user",
                assigned_roles=["user"],
                personal_settings={"currency": "EUR", "theme": "family", "dashboard_density": "comfortable", "onboarding_style": "coach"},
                is_active=True,
            )
            db.add(user)
            db.flush()

        # Attach OAuth identity
        identity = OAuthIdentity(user_id=user.id, provider=provider, provider_sub=provider_sub)
        db.add(identity)
        db.commit()
        db.refresh(user)

    if not user or not user.is_active:
        return RedirectResponse(f"{settings.public_base_url}/?oauth_error=account_disabled")

    db.refresh(user)

    # Issue JWT tokens
    access_tok, expires_in = create_access_token(user.id, user.email, user.role, mfa_verified=False)
    refresh_tok = create_refresh_token(redis_client, user.id, user.email, user.role, mfa_verified=False)

    write_audit_log(
        db, user.id, "auth.oauth_login",
        {"provider": provider, "email": email_norm},
        ip_address=request.client.host if request.client else None,
    )

    import urllib.parse
    fragment = urllib.parse.urlencode({"oauth_access": access_tok, "oauth_refresh": refresh_tok})
    return RedirectResponse(f"{settings.public_base_url}/?{fragment}")
@app.get("/auth/me", response_model=UserProfileResponse)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> UserProfileResponse:
    write_audit_log(db, current_user.id, "auth.me_viewed", {})
    return to_user_profile(current_user)


@app.put("/auth/me/settings", response_model=UserProfileResponse)
def update_me_settings(payload: UserSettingsUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> UserProfileResponse:
    if payload.full_name:
        current_user.full_name = payload.full_name.strip()
    current_user.phone_number = payload.phone_number.strip() if payload.phone_number else None
    merged_settings = dict(current_user.personal_settings or {})
    merged_settings.update(payload.personal_settings)
    current_user.personal_settings = merged_settings
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    write_audit_log(db, current_user.id, "user.settings_updated", {"settings_keys": list(payload.personal_settings.keys())})
    return to_user_profile(current_user)


@app.post("/auth/mfa/setup", response_model=MfaSetupResponse)
def setup_mfa(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> MfaSetupResponse:
    secret = generate_totp_secret()
    device = primary_mfa_device(db, current_user.id)
    if device:
        device.secret_encrypted = encrypt_secret(secret)
        device.is_verified = False
        device.recovery_codes = None
    else:
        device = MfaDevice(
            user_id=current_user.id,
            secret_encrypted=encrypt_secret(secret),
            is_primary=True,
            is_verified=False,
        )
    db.add(device)
    db.commit()
    write_audit_log(db, current_user.id, "auth.mfa_setup_requested", {})
    return MfaSetupResponse(secret=secret, otpauth_uri=build_totp_uri(current_user.email, secret))


@app.post("/auth/mfa/verify", response_model=MfaVerifyResponse)
def verify_mfa_setup(payload: MfaVerifyRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> MfaVerifyResponse:
    device = primary_mfa_device(db, current_user.id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MFA device not found")
    secret = decrypt_secret(device.secret_encrypted)
    if not verify_totp(secret, payload.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid MFA code")

    recovery_codes, hashed_codes = generate_recovery_codes()
    device.is_verified = True
    device.recovery_codes = hashed_codes
    device.last_used_at = datetime.utcnow()
    current_user.mfa_enabled = True
    db.add(device)
    db.add(current_user)
    db.commit()
    write_audit_log(db, current_user.id, "auth.mfa_enabled", {})
    return MfaVerifyResponse(enabled=True, recovery_codes=recovery_codes)


@app.get("/api/v1/admin/users", response_model=list[UserProfileResponse])
def admin_list_users(_: User = Depends(require_admin_user), db: Session = Depends(get_db)) -> list[UserProfileResponse]:
    users = db.scalars(select(User).order_by(User.created_at.desc())).all()
    write_audit_log(db, _.id, "admin.users_listed", {"count": len(users)})
    return [to_user_profile(user) for user in users]


@app.put("/api/v1/admin/users/{user_id}", response_model=UserProfileResponse)
def admin_update_user(user_id: str, payload: AdminUserUpdateRequest, admin_user: User = Depends(require_admin_user), db: Session = Depends(get_db)) -> UserProfileResponse:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if payload.full_name:
        user.full_name = payload.full_name.strip()
    if payload.assigned_roles is not None:
        user.assigned_roles = normalize_roles(payload.assigned_roles)
        user.role = primary_role_from_roles(user.assigned_roles)
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.personal_settings is not None:
        merged_settings = dict(user.personal_settings or {})
        merged_settings.update(payload.personal_settings)
        user.personal_settings = merged_settings
    db.add(user)
    db.commit()
    db.refresh(user)
    write_audit_log(db, admin_user.id, "admin.user_updated", {"target_user_id": user.id, "assigned_roles": user.assigned_roles, "is_active": user.is_active})
    return to_user_profile(user)


@app.get("/api/v1/admin/audit-trail", response_model=list[AuditLogResponse])
def admin_audit_trail(_: User = Depends(require_admin_user), db: Session = Depends(get_db)) -> list[AuditLogResponse]:
    logs = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(200)).all()
    write_audit_log(db, _.id, "admin.audit_trail_viewed", {"count": len(logs)})
    return [
        AuditLogResponse(
            id=entry.id,
            actor_id=entry.actor_id,
            event_type=entry.event_type,
            severity=entry.severity,
            device_fingerprint=entry.device_fingerprint,
            ip_address=entry.ip_address,
            payload=entry.payload,
            created_at=entry.created_at.isoformat(),
        )
        for entry in logs
    ]


@app.get("/api/v1/admin/broker-connections")
def admin_broker_connections(_: User = Depends(require_admin_user), db: Session = Depends(get_db)) -> list[dict]:
    """Return all broker connections keyed by user_id for the admin panel."""
    connections = db.scalars(select(BrokerConnection).order_by(BrokerConnection.created_at.desc())).all()
    write_audit_log(db, _.id, "admin.broker_connections_listed", {"count": len(connections)})
    return [
        {
            "user_id": c.user_id,
            "provider_code": c.provider_code,
            "provider_name": c.provider_name,
            "status": c.status,
            "account_label": c.account_label,
        }
        for c in connections
    ]


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
def dashboard(portfolio_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> DashboardResponse:
    portfolio = db.scalar(select(Portfolio).where(Portfolio.id == portfolio_id, Portfolio.owner_id == current_user.id).limit(1))
    if not portfolio:
        portfolio = db.scalar(select(Portfolio).where(Portfolio.owner_id == current_user.id).limit(1))
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    write_audit_log(db, current_user.id, "dashboard.viewed", {"portfolio_id": portfolio.id})

    bank_connectors = list_bank_providers_for_user(db, current_user.id)
    connections = db.scalars(select(BrokerConnection).where(BrokerConnection.user_id == current_user.id)).all()
    active_connections = [connection for connection in connections if connection.status == "active"]
    if not active_connections:
        return build_dashboard_from_positions(portfolio, bank_connectors, connections, [])

    positions = db.scalars(
        select(IntegrationPosition).where(IntegrationPosition.connection_id.in_([connection.id for connection in active_connections]))
    ).all()
    return build_dashboard_from_positions(portfolio, bank_connectors, connections, positions)


@app.get("/api/v1/broker-connections/providers", response_model=list[BankProvider])
def broker_connection_providers(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[BankProvider]:
    write_audit_log(db, current_user.id, "broker.providers_listed", {})
    return list_bank_providers_for_user(db, current_user.id)


@app.get("/api/v1/integrations", response_model=list[IntegrationConnectionResponse])
def list_integrations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[IntegrationConnectionResponse]:
    connections = db.scalars(select(BrokerConnection).where(BrokerConnection.user_id == current_user.id).order_by(BrokerConnection.created_at.desc())).all()
    return [serialize_integration_connection(db, connection) for connection in connections]


@app.post("/api/v1/broker-connections/request", response_model=BankConnectionResponse, status_code=status.HTTP_201_CREATED)
def request_broker_connection(payload: BankConnectionRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> BankConnectionResponse:
    provider = next((item for item in SUPPORTED_BANK_PROVIDERS if item["code"] == payload.provider_code), None)
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not supported")

    existing = db.scalar(
        select(BrokerConnection).where(
            BrokerConnection.user_id == current_user.id,
            BrokerConnection.provider_code == payload.provider_code,
        )
    )
    if existing:
        existing.status = "active"
        if payload.account_label:
            existing.account_label = payload.account_label
        db.add(existing)
        db.commit()
        db.refresh(existing)
        write_audit_log(db, current_user.id, "broker.connection_reused", {"provider_code": existing.provider_code, "status": existing.status})
        return BankConnectionResponse(connection_id=existing.id, provider_code=existing.provider_code, status=existing.status)

    connection = BrokerConnection(
        user_id=current_user.id,
        provider_code=provider["code"],
        provider_name=provider["name"],
        status="active",
        account_label=payload.account_label,
        supports_read=True,
        supports_trade=False,
    )
    db.add(connection)
    db.commit()
    db.refresh(connection)
    write_audit_log(db, current_user.id, "broker.connection_requested", {"provider_code": provider["code"]})
    return BankConnectionResponse(connection_id=connection.id, provider_code=connection.provider_code, status=connection.status)


@app.post("/api/v1/broker-connections/toggle", response_model=BankIntegrationToggleResponse)
def toggle_broker_connection(payload: BankIntegrationToggleRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> BankIntegrationToggleResponse:
    provider = next((item for item in SUPPORTED_BANK_PROVIDERS if item["code"] == payload.provider_code), None)
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not supported")

    connection = db.scalar(
        select(BrokerConnection).where(
            BrokerConnection.user_id == current_user.id,
            BrokerConnection.provider_code == payload.provider_code,
        )
    )

    target_status = "active" if payload.enabled else "disabled"
    if connection is None:
        connection = BrokerConnection(
            user_id=current_user.id,
            provider_code=provider["code"],
            provider_name=provider["name"],
            status=target_status,
            account_label=payload.account_label,
            supports_read=True,
            supports_trade=False,
        )
    else:
        connection.status = target_status
        if payload.account_label:
            connection.account_label = payload.account_label

    db.add(connection)
    db.commit()
    db.refresh(connection)
    write_audit_log(
        db,
        current_user.id,
        "broker.connection_toggled",
        {"provider_code": connection.provider_code, "enabled": payload.enabled, "status": connection.status},
    )
    return BankIntegrationToggleResponse(
        connection_id=connection.id,
        provider_code=connection.provider_code,
        status=connection.status,
    )


@app.put("/api/v1/integrations/credentials", response_model=IntegrationConnectionResponse)
def upsert_integration_credentials(payload: IntegrationCredentialRequest, current_user: User = Depends(require_mfa_for_sensitive_operation), db: Session = Depends(get_db)) -> IntegrationConnectionResponse:
    provider = next((item for item in SUPPORTED_BANK_PROVIDERS if item["code"] == payload.provider_code), None)
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not supported")

    connection = db.scalar(
        select(BrokerConnection).where(
            BrokerConnection.user_id == current_user.id,
            BrokerConnection.provider_code == payload.provider_code,
        )
    )
    if connection is None:
        connection = BrokerConnection(
            user_id=current_user.id,
            provider_code=provider["code"],
            provider_name=provider["name"],
            status="active",
            supports_read=True,
            supports_trade=False,
        )

    if payload.account_label is not None:
        connection.account_label = payload.account_label.strip() or None
    if payload.api_key:
        connection.api_key_encrypted = encrypt_secret(payload.api_key.strip())
    if payload.api_secret:
        connection.api_secret_encrypted = encrypt_secret(payload.api_secret.strip())
    if payload.external_portfolio_id is not None:
        connection.external_portfolio_id = payload.external_portfolio_id.strip() or None

    db.add(connection)
    db.commit()
    db.refresh(connection)
    write_audit_log(db, current_user.id, "integration.credentials_updated", {"provider_code": connection.provider_code})
    return serialize_integration_connection(db, connection)


@app.post("/api/v1/integrations/{provider_code}/sync", response_model=IntegrationSyncResponse)
def sync_integration(provider_code: str, current_user: User = Depends(require_mfa_for_sensitive_operation), db: Session = Depends(get_db)) -> IntegrationSyncResponse:
    connection = db.scalar(
        select(BrokerConnection).where(
            BrokerConnection.user_id == current_user.id,
            BrokerConnection.provider_code == provider_code,
        )
    )
    if connection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration not configured")

    try:
        return run_provider_sync(db, current_user, connection)
    except HTTPException:
        raise
    except Exception as exc:
        connection.last_sync_at = datetime.utcnow()
        connection.last_sync_status = "error"
        connection.last_sync_error = str(exc)
        db.add(connection)
        db.add(
            IntegrationSyncEvent(
                connection_id=connection.id,
                provider_code=connection.provider_code,
                status="error",
                error_message=str(exc),
            )
        )
        db.commit()
        logger.exception("Integration sync failed")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Integration sync failed: {exc}") from exc


@app.post("/api/v1/recommendations", response_model=RecommendationResponse)
def recommendations(payload: RecommendationRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> RecommendationResponse:
    if is_kill_switch_active(db):
        raise HTTPException(status_code=423, detail="Kill switch active")

    agents = build_agent_bundle(payload)
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
    write_audit_log(db, current_user.id, "recommendation.generated", response.model_dump())
    return response


@app.post("/api/v1/orders/propose", response_model=TradeProposalResponse)
def propose_order(payload: TradeProposalRequest, current_user: User = Depends(require_mfa_for_sensitive_operation), db: Session = Depends(get_db)) -> TradeProposalResponse:
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

    write_audit_log(db, current_user.id, "trade.proposed", {"proposal_id": proposal.id, "asset": proposal.asset_symbol})
    return TradeProposalResponse(proposal_id=proposal.id, status=proposal.status, approval_required=True)


@app.post("/api/v1/orders/approve")
def approve_order(payload: TradeApprovalRequest, current_user: User = Depends(require_mfa_for_sensitive_operation), db: Session = Depends(get_db)) -> dict:
    proposal = db.get(TradeProposal, payload.proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    proposal.status = "approved" if payload.approved else "rejected"
    db.add(proposal)
    db.commit()

    write_audit_log(
        db,
        current_user.id,
        "trade.approval",
        {"proposal_id": proposal.id, "approved": payload.approved},
        device_fingerprint=payload.device_fingerprint,
        ip_address=payload.ip_address,
    )
    return {"proposal_id": proposal.id, "status": proposal.status}


@app.post("/api/v1/kill-switch/activate")
def activate_kill_switch(payload: KillSwitchRequest, current_user: User = Depends(require_mfa_for_sensitive_operation), db: Session = Depends(get_db)) -> dict:
    event = KillSwitchEvent(activated=True, reason=payload.reason, actor_id=current_user.id)
    db.add(event)
    db.commit()
    write_audit_log(db, current_user.id, "kill_switch.activated", {"reason": payload.reason})
    redis_client.set("kill_switch", "true")
    return {"active": True, "reason": payload.reason}


@app.post("/api/v1/kill-switch/release")
def release_kill_switch(payload: KillSwitchRequest, current_user: User = Depends(require_mfa_for_sensitive_operation), db: Session = Depends(get_db)) -> dict:
    event = KillSwitchEvent(activated=False, reason=payload.reason, actor_id=current_user.id)
    db.add(event)
    db.commit()
    write_audit_log(db, current_user.id, "kill_switch.released", {"reason": payload.reason})
    redis_client.set("kill_switch", "false")
    return {"active": False, "reason": payload.reason}


@app.get("/api/v1/opportunities")
def opportunities(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    write_audit_log(db, current_user.id, "opportunities.viewed", {})
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
def estimate_tax(payload: TaxEstimateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> TaxEstimateResponse:
    taxable_base = max(Decimal("0"), payload.realized_gains - payload.realized_losses)
    estimated_tax = taxable_base * payload.flat_tax_rate
    response = TaxEstimateResponse(
        taxable_base=taxable_base,
        estimated_tax=estimated_tax.quantize(Decimal("0.01")),
        regime="PFU 30%",
    )
    write_audit_log(db, current_user.id, "tax.estimated", response.model_dump())
    return response
