#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/home/ubuntu/nayonne"
BACKUP_DIR="$ROOT_DIR/backups/$(date +%F)"
mkdir -p "$BACKUP_DIR"

cd "$ROOT_DIR"

# PostgreSQL dump
sudo docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_DIR/db.sql"

# MinIO data snapshot (volume archive)
sudo tar -czf "$BACKUP_DIR/minio_data.tgz" /var/lib/docker/volumes/nayonne-starter_nayonne_minio_data/_data || true

# Keep 14 days
find "$ROOT_DIR/backups" -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +

echo "Backup done: $BACKUP_DIR"
