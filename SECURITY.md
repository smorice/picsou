# Security Baseline

This repository now includes a minimum production-grade authentication layer and infrastructure hardening baseline:

- Password hashing with Argon2id.
- Signed short-lived access tokens.
- Rotating refresh tokens stored in Redis.
- TOTP MFA with encrypted shared secrets.
- Recovery codes stored as SHA-256 hashes.
- Login throttling and account lockout.
- Audit logging for registration, login, MFA, tax, trade, and kill switch actions.

## Required production secrets

Set the following in the VPS `.env` file before real usage:

- `POSTGRES_PASSWORD`
- `JWT_SECRET_KEY`
- `DATA_ENCRYPTION_KEY`
- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`

## Remaining real-world controls

- Add domain DNS and enable HTTPS before real users authenticate.
- Move broker credentials to a dedicated secret manager.
- Integrate KYC, consent storage, and broker sandbox testing before live trading.
- Add frontend login flows using secure cookies or a backend-for-frontend session model.