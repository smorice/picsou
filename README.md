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

## Reset password par email

- Si `SMTP_HOST` et `SMTP_FROM_EMAIL` sont renseignes, l API envoie un email de reinitialisation avec un lien direct vers l interface.
- Si SMTP n est pas configure, l API conserve un fallback en renvoyant un code temporaire dans la reponse pour les environnements de test et d administration.
- Variables utiles: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`, `SMTP_STARTTLS`, `SMTP_USE_SSL`.

### Configuration OVHcloud (DNS + SMTP)

1. Configurer les enregistrements MX de votre domaine OVH:
	- priorite 1: `mx1.mail.ovh.net`
	- priorite 5: `mx2.mail.ovh.net`
	- priorite 100: `mx3.mail.ovh.net`
2. Configurer l envoi SMTP de l API avec la boite OVH:
	- `SMTP_HOST=ssl0.ovh.net`
	- `SMTP_PORT=587`
	- `SMTP_STARTTLS=true`
	- `SMTP_USE_SSL=false`
	- `SMTP_USERNAME=<votre-adresse-email-ovh>`
	- `SMTP_PASSWORD=<mot-de-passe-ou-mot-de-passe-app-ovh>`
	- `SMTP_FROM_EMAIL=<votre-adresse-email-ovh>`
3. Redemarrer la stack: `docker compose up -d --build api`

## Connexion Google

- Le frontend affiche automatiquement le bouton Google si `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont renseignes.
- Renseigner dans `.env`:
	- `GOOGLE_CLIENT_ID=<client-id-google>`
	- `GOOGLE_CLIENT_SECRET=<client-secret-google>`
	- `PUBLIC_BASE_URL=https://votre-domaine-ou-ip`
- Dans Google Cloud Console, ajouter l URI de redirection autorisee:
	- `https://votre-domaine-ou-ip/auth/oauth/google/callback`
- Redemarrer la stack apres modification de `.env`: `docker compose up -d --build api web`

## MFA et connexion

- Une fois MFA activee, la connexion par mot de passe demande un code TOTP ou un code de recuperation.
- Si un code MFA est saisi mais incorrect, l API renvoie maintenant explicitement `Invalid MFA code` au lieu de rester sur un etat ambigu.

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
