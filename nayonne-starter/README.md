# Les Nayonnes - Reseau social familial prive

Starter full-stack isole pour un site collaboratif prive (50 utilisateurs) avec:

- Backend FastAPI (auth JWT, feed, events, chat websocket)
- Frontend Next.js (UX chaleureuse, mobile-first)
- PostgreSQL (donnees relationnelles)
- Redis (presence/chat/cache)
- MinIO (photos/videos)
- Nginx (reverse proxy isole sous `/nayonne`)

## 1) Isolation stricte vis-a-vis de Robin

- Repertoire dedie: `/home/ubuntu/nayonne`
- Services Docker dedies (`nayonne-*`)
- Ports dedies (`3002`, `8082`, `5434`, `6382`, `9002`)
- Config Nginx dediee: `infra/nginx/nayonne.conf`
- Base PostgreSQL dediee: `nayonne`

Aucune modification necessaire dans Robin hors ajout d'un `server/location` cible pour `/nayonne`.

## 2) Dossiers

- `apps/api`: API FastAPI
- `apps/web`: UI Next.js
- `infra/nginx`: conf reverse proxy
- `docs`: architecture, schema BDD, runbook
- `scripts`: deploiement, sauvegardes

## 3) Demarrage local/serveur

```bash
cp .env.example .env
# editer les secrets

docker compose build
docker compose up -d
```

- Web: `http://localhost:3002/nayonne`
- API health: `http://localhost:8082/healthz`

## 4) Deploiement VPS Ubuntu

Voir:

- `docs/vps-deploy.md`
- `infra/nginx/nayonne.conf`
- `scripts/deploy.sh`

## 5) Livrables demandes

1. Architecture complete: `docs/architecture.md`
2. Structure projet: section dossiers + arborescence Git
3. Schema base de donnees: `docs/database-schema.md` + `docs/erd-mermaid.md`
4. Technologies recommandees: `docs/architecture.md`
5. Exemples backend: `apps/api/app`
6. Exemples frontend: `apps/web/app`
7. Plan deploiement VPS: `docs/vps-deploy.md`
8. Configuration Nginx: `infra/nginx/nayonne.conf`
9. Instructions Git: section `Git`

## 6) Git

```bash
git init
git remote add origin git@github.com:smorice/Nayonne.git
git add .
git commit -m "feat: bootstrap les nayonnes private social platform"
git push -u origin main
```
