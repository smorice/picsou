# Picsou IA

Picsou IA est une base deployable pour une plateforme d'assistance a l'investissement long terme avec controle humain, auditabilite et garde-fous de risque. Ce depot contient un socle monorepo pret a tourner sur un VPS avec Next.js, FastAPI, PostgreSQL, Redis et Caddy.

## Architecture livree

- Frontend Next.js App Router pour le dashboard.
- API Gateway FastAPI avec endpoints metier conformes au perimetre demande.
- PostgreSQL pour la persistance des portefeuilles, decisions, propositions d'ordres, audit et kill switch.
- Redis pour l'etat operationnel rapide et l'extensibilite temps reel.
- Caddy comme reverse proxy HTTP avec headers de securite.
- Deploiement Docker Compose sur VPS.

## Structure

```text
apps/
	api/
	web/
infra/
	caddy/
	scripts/
docker-compose.yml
.env.example
```

## Endpoints exposes

- `GET /health`
- `GET /api/v1/dashboard/{portfolio_id}`
- `POST /api/v1/recommendations`
- `POST /api/v1/orders/propose`
- `POST /api/v1/orders/approve`
- `POST /api/v1/kill-switch/activate`
- `POST /api/v1/kill-switch/release`
- `GET /api/v1/opportunities`
- `POST /api/v1/tax/estimate`

## Lancement local via Docker

1. Copier `.env.example` vers `.env`.
2. Ajuster au minimum `POSTGRES_PASSWORD`.
3. Lancer `docker compose up -d --build`.
4. Ouvrir `http://localhost`.

## Deploiement VPS

1. Copier `.env.example` vers `.env`.
2. Renseigner `REMOTE_HOST`, `REMOTE_PORT`, `REMOTE_USER` et `REMOTE_APP_DIR`.
3. Verifier que le compte SSH distant a le droit d'executer Docker ou `sudo`.
4. Executer `chmod +x infra/scripts/deploy.sh && ./infra/scripts/deploy.sh`.

Le script:

- synchronise le depot via `rsync`
- installe Docker si necessaire
- installe le plugin Compose si necessaire
- cree `.env` sur le VPS s'il n'existe pas
- construit et demarre la stack

## Limites actuelles

- Le moteur de recommandation est un socle deterministe, pas encore un vrai systeme multi-agents branche a des flux marche temps reel.
- L'execution broker Revolut n'est pas cablee dans ce socle afin de conserver le controle humain strict et d'eviter d'inventer une integration non testee.
- Le deploiement distant depend d'un acces SSH non interactif valide depuis cette machine.

## Prochaines extensions naturelles

- Ajout d'authentification OIDC/MFA.
- Migrations SQLAlchemy/Alembic.
- Jobs d'ingestion marche et signaux.
- Integration broker via couche d'execution signee et auditee.
- TLS avec domaine dedie devant Caddy.
