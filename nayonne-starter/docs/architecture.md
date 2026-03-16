# Architecture cible - Les Nayonnes

## Stack recommandee

- Frontend: Next.js 15 (App Router) + TypeScript
- Backend: FastAPI + SQLAlchemy + Pydantic
- DB: PostgreSQL 16
- Chat/presence/cache: Redis
- Media: MinIO (S3-compatible)
- Reverse proxy: Nginx
- Observabilite: logs JSON + rotation + stats admin

## Pourquoi cette architecture

- Durable: composants standards et maintenables
- Performante: separation front/api + cache Redis
- Securisee: JWT, hash bcrypt, rate limiting, validation stricte
- Evolutive: ajout facile de modules (forum, recettes, calendrier)

## Domaines fonctionnels

- Comptes: roles `nayonne`, `nayonnion`, `admin`
- Feed: articles, medias, reactions, commentaires
- Chronologie: date de souvenir personnalisee
- Carte: geolocalisation approximative des membres
- Chat: websocket et historique
- Admin: validation comptes, logs, statistiques
- Integrations: import de publications reseaux sociaux vers News

## Flux principal

1. L'utilisateur s'authentifie (JWT)
2. Le front charge le feed personnel
3. Les posts lus sont marques `seen` pour cet utilisateur
4. Le post reste accessible dans l'historique global
5. Les medias sont stockes dans MinIO et references en DB

## Fiabilite et long terme

- Sauvegardes quotidiennes DB + MinIO
- Export JSON/CSV des donnees
- Migrations SQL versionnees
- Politique retention logs
