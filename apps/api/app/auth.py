import base64
import hashlib
import json
import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import jwt
import pyotp
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError, VerificationError
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from redis import Redis

from .config import settings

pwd_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)


@dataclass
class AuthenticatedPrincipal:
    user_id: str
    email: str
    role: str
    mfa_verified: bool


def hash_password(password: str) -> str:
    return pwd_hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return pwd_hasher.verify(password_hash, password)
    except (InvalidHashError, VerifyMismatchError, VerificationError):
        return False


def validate_password_strength(password: str) -> None:
    checks = [
        any(char.islower() for char in password),
        any(char.isupper() for char in password),
        any(char.isdigit() for char in password),
        any(not char.isalnum() for char in password),
        len(password) >= 14,
    ]
    if not all(checks):
        raise ValueError("Password must be at least 14 chars and include upper, lower, digit, and symbol")


def _decode_encryption_key() -> bytes:
    padded = settings.data_encryption_key + ("=" * (-len(settings.data_encryption_key) % 4))
    return base64.urlsafe_b64decode(padded)


def encrypt_secret(value: str) -> str:
    nonce = secrets.token_bytes(12)
    ciphertext = AESGCM(_decode_encryption_key()).encrypt(nonce, value.encode("utf-8"), None)
    return base64.urlsafe_b64encode(nonce + ciphertext).decode("utf-8")


def decrypt_secret(value: str) -> str:
    raw = base64.urlsafe_b64decode(value.encode("utf-8"))
    nonce, ciphertext = raw[:12], raw[12:]
    plaintext = AESGCM(_decode_encryption_key()).decrypt(nonce, ciphertext, None)
    return plaintext.decode("utf-8")


def create_access_token(user_id: str, email: str, role: str, mfa_verified: bool) -> tuple[str, int]:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.access_token_ttl_minutes)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "mfa_verified": mfa_verified,
        "type": "access",
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "iss": settings.app_name,
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")
    return token, int((expires_at - now).total_seconds())


def decode_access_token(token: str) -> AuthenticatedPrincipal:
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"], issuer=settings.app_name)
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("Invalid token type")
    return AuthenticatedPrincipal(
        user_id=payload["sub"],
        email=payload["email"],
        role=payload["role"],
        mfa_verified=bool(payload.get("mfa_verified", False)),
    )


def _refresh_key(token: str) -> str:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    return f"auth:refresh:{token_hash}"


def create_refresh_token(redis_client: Redis, user_id: str, email: str, role: str, mfa_verified: bool) -> str:
    token = secrets.token_urlsafe(48)
    ttl_seconds = settings.refresh_token_ttl_days * 24 * 60 * 60
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "mfa_verified": mfa_verified,
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }
    redis_client.setex(_refresh_key(token), ttl_seconds, json.dumps(payload))
    return token


def rotate_refresh_token(redis_client: Redis, token: str) -> tuple[str, dict]:
    payload = get_refresh_payload(redis_client, token)
    revoke_refresh_token(redis_client, token)
    new_token = create_refresh_token(
        redis_client,
        payload["user_id"],
        payload["email"],
        payload["role"],
        payload["mfa_verified"],
    )
    return new_token, payload


def get_refresh_payload(redis_client: Redis, token: str) -> dict:
    raw_payload = redis_client.get(_refresh_key(token))
    if not raw_payload:
        raise ValueError("Refresh token invalid or expired")
    return json.loads(raw_payload)


def revoke_refresh_token(redis_client: Redis, token: str) -> None:
    redis_client.delete(_refresh_key(token))


def _password_reset_key(token: str) -> str:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    return f"auth:password-reset:{token_hash}"


def create_password_reset_token(redis_client: Redis, user_id: str, email: str) -> str:
    token = secrets.token_urlsafe(32)
    ttl_seconds = settings.password_reset_ttl_minutes * 60
    payload = {
        "user_id": user_id,
        "email": email,
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }
    redis_client.setex(_password_reset_key(token), ttl_seconds, json.dumps(payload))
    return token


def consume_password_reset_token(redis_client: Redis, token: str) -> dict:
    raw_payload = redis_client.get(_password_reset_key(token))
    if not raw_payload:
        raise ValueError("Reset token invalid or expired")
    redis_client.delete(_password_reset_key(token))
    return json.loads(raw_payload)


def _email_mfa_key(user_id: str, purpose: str) -> str:
    return f"auth:mfa:{purpose}:{user_id}"


def create_email_mfa_code(redis_client: Redis, user_id: str, email: str, purpose: str) -> str:
    code = f"{secrets.randbelow(900000) + 100000}"
    ttl_seconds = settings.mfa_email_code_ttl_minutes * 60
    payload = {
        "user_id": user_id,
        "email": email,
        "code_hash": hashlib.sha256(code.encode("utf-8")).hexdigest(),
        "purpose": purpose,
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }
    redis_client.setex(_email_mfa_key(user_id, purpose), ttl_seconds, json.dumps(payload))
    return code


def consume_email_mfa_code(redis_client: Redis, user_id: str, code: str, purpose: str) -> bool:
    raw_payload = redis_client.get(_email_mfa_key(user_id, purpose))
    if not raw_payload:
        return False
    payload = json.loads(raw_payload)
    normalized_code = re.sub(r"\D", "", code or "")
    candidate_hash = hashlib.sha256(normalized_code.encode("utf-8")).hexdigest()
    if payload.get("code_hash") != candidate_hash:
        return False
    redis_client.delete(_email_mfa_key(user_id, purpose))
    return True


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def build_totp_uri(email: str, secret: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=settings.app_name)


def verify_totp(secret: str, code: str) -> bool:
    normalized_code = re.sub(r"\D", "", code or "")
    if not normalized_code:
        return False
    return pyotp.TOTP(secret).verify(normalized_code, valid_window=1)


def generate_recovery_codes() -> tuple[list[str], list[str]]:
    plain_codes = [f"{secrets.token_hex(4)[:4]}-{secrets.token_hex(4)[:4]}".upper() for _ in range(8)]
    hashed_codes = [hashlib.sha256(code.encode("utf-8")).hexdigest() for code in plain_codes]
    return plain_codes, hashed_codes


def consume_recovery_code(stored_hashes: list[str] | None, candidate: str | None) -> list[str] | None:
    if not stored_hashes or not candidate:
        return None
    candidate_hash = hashlib.sha256(candidate.strip().upper().encode("utf-8")).hexdigest()
    if candidate_hash not in stored_hashes:
        return None
    return [item for item in stored_hashes if item != candidate_hash]