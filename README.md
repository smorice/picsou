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
- `POST /api/v1/betting/value-scan`
- `POST /api/v1/betting/odds/fetch`
- `POST /api/v1/betting/model/poisson`
- `POST /api/v1/betting/decision/combined`
- `GET /api/v1/betting/analytics/summary`
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

### Domaine canonique et redirections

- Domaine de reference/canonique: `https://nayonne.ovh`
- Les acces via `http://79.137.75.219` et `https://79.137.75.219` sont rediriges en permanent vers `https://nayonne.ovh`.
- `www.nayonne.ovh` est aussi redirige vers `https://nayonne.ovh`.
- La variable `PUBLIC_BASE_URL` doit pointer vers `https://nayonne.ovh` pour que les liens emis par l API restent coherents (emails, callbacks OAuth).

## Limites actuelles

- Le moteur de recommandation est un socle deterministe, pas encore un vrai systeme multi-agents branche a des flux marche temps reel.
- L'execution broker Revolut n'est pas cablee dans ce socle afin de conserver le controle humain strict et d'eviter d'inventer une integration non testee.
- Le deploiement distant depend d'un acces SSH non interactif valide depuis cette machine.

## Agent IA Paris En Ligne (socle implemente)

Le backend inclut un premier moteur de decision paris en ligne base sur:

- comparaison multi-bookmakers (selection de la meilleure cote),
- calcul de probabilite implicite,
- calcul de value bet (`value = p_modele * cote - 1`),
- sizing bankroll via Kelly fractionne,
- cap de mise par pari en pourcentage de bankroll.

### Endpoint de scan value bet

- `POST /api/v1/betting/value-scan`
- Entree:
	- liste d evenements (`event_id`, `event_label`, `sport`, `model_win_probability`)
	- cotes par bookmaker
	- configuration risque (`bankroll_eur`, `kelly_fraction`, `min_edge`, `max_stake_pct_per_bet`, `max_stake_eur`)
- Sortie:
	- opportunites triees par value decroissante
	- decision `bet` / `skip`
	- bookmaker retenu, edge, value, stake en EUR et en % bankroll

### Endpoint odds live (The Odds API)

- `POST /api/v1/betting/odds/fetch`
- Parametres: `sport_key`, `regions`, `markets`
- Variables env:
	- `THE_ODDS_API_KEY`
	- `THE_ODDS_API_BASE_URL` (defaut: `https://api.the-odds-api.com/v4`)
	- `THE_ODDS_CACHE_TTL_SECONDS` (defaut: `20`)

### Endpoint modele Poisson football

- `POST /api/v1/betting/model/poisson`
- Entree:
	- `expected_goals_home`
	- `expected_goals_away`
	- `max_goals`
- Sortie:
	- probabilites `home_win`, `draw`, `away_win`

### Endpoint analytics betting

- `GET /api/v1/betting/analytics/summary`
- KPI retournes:
	- ROI
	- yield
	- variance
	- max drawdown
	- win rate
	- nombre de paris

### Endpoint combine (odds + Poisson + value)

- `POST /api/v1/betting/decision/combined`
- Pipeline execute:
	- fetch des cotes live (avec cache Redis)
	- probabilite home-win via modele Poisson
	- calcul edge/value
	- sizing Kelly fractionne
	- decision finale `bet` ou `skip`

Exemple logique:

- modèle: `p = 0.62`
- meilleure cote: `2.05`
- value: `0.62 * 2.05 - 1 = 0.271`
- si edge et contraintes risque valides, le moteur propose un stake Kelly fractionne.

### Extensions naturelles pour production

- ingestion temps reel des cotes (Sportradar / The Odds API / Stats Perform),
- pipeline stream (Kafka + ETL),
- modeles probabilistes sport-specifiques (Elo, Poisson foot, XGBoost),
- execution bookmaker API (Pinnacle/Betfair) puis fallback automation navigateur (Playwright),
- analytics avancees (ROI, yield, variance, drawdown, performance par ligue).

## Prochaines extensions naturelles

- Ajout d'authentification OIDC/MFA.
- Migrations SQLAlchemy/Alembic.
- Jobs d'ingestion marche et signaux.
- Integration broker via couche d'execution signee et auditee.
- TLS avec domaine dedie devant Caddy.
