#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/nayonne"
BRANCH="main"

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "[INFO] Initial clone into $APP_DIR"
  git clone git@github.com:smorice/Nayonne.git "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [[ ! -f .env ]]; then
  echo "[WARN] .env not found, copying from .env.example"
  cp .env.example .env
  echo "[WARN] Please edit .env before first production run"
fi

docker compose pull
docker compose build --pull
docker compose up -d

echo "[INFO] Nayonne deployed successfully"
