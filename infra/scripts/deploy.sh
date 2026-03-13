#!/usr/bin/env bash
set -euo pipefail

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

: "${REMOTE_HOST:?REMOTE_HOST is required}"
: "${REMOTE_PORT:?REMOTE_PORT is required}"
: "${REMOTE_USER:?REMOTE_USER is required}"
: "${REMOTE_APP_DIR:?REMOTE_APP_DIR is required}"

SUDO=""
if ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "command -v sudo >/dev/null 2>&1"; then
  SUDO="sudo"
fi

ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "mkdir -p '$REMOTE_APP_DIR'"
rsync -az --delete \
  --exclude '.git' \
  --exclude '.next' \
  --exclude 'node_modules' \
  --exclude '__pycache__' \
  -e "ssh -p $REMOTE_PORT" ./ "$REMOTE_USER@$REMOTE_HOST:$REMOTE_APP_DIR/"

ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "
  set -euo pipefail
  SUDO='$SUDO'
  cd '$REMOTE_APP_DIR'
  if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | $SUDO sh
  fi
  if ! docker compose version >/dev/null 2>&1; then
    $SUDO apt-get update && $SUDO apt-get install -y docker-compose-plugin
  fi
  if [[ ! -f .env ]]; then
    cp .env.example .env
  fi
  $SUDO docker compose pull caddy postgres redis || true
  $SUDO docker compose up -d --build
  $SUDO docker compose ps
"
