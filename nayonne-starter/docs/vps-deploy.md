# Plan de deploiement VPS Ubuntu (isole de Robin)

## 1. Installation dependances

```bash
sudo apt update
sudo apt install -y git curl ca-certificates gnupg nginx certbot python3-certbot-nginx

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
```

## 2. Clone du repo

```bash
sudo mkdir -p /home/ubuntu/nayonne
sudo chown -R ubuntu:ubuntu /home/ubuntu/nayonne
git clone git@github.com:smorice/Nayonne.git /home/ubuntu/nayonne
cd /home/ubuntu/nayonne
cp .env.example .env
```

## 3. Variables critiques

- `APP_SECRET_KEY`: secret fort (>= 32 chars)
- `POSTGRES_PASSWORD`
- `MINIO_ROOT_PASSWORD`

## 4. Lancer la stack

```bash
cd /home/ubuntu/nayonne
docker compose up -d --build
```

## 5. Configuration Nginx (site dedie)

```bash
sudo cp infra/nginx/nayonne.conf /etc/nginx/sites-available/nayonne.conf
sudo ln -s /etc/nginx/sites-available/nayonne.conf /etc/nginx/sites-enabled/nayonne.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 6. HTTPS

```bash
sudo certbot --nginx -d nayonne.ovh
```

## 7. Service backend

Le backend est lance par Docker Compose (`nayonne-api`) et redemarre automatiquement.

## 8. Sauvegardes automatiques

Creer un cron quotidien qui execute `scripts/backup.sh` (fichier inclus dans ce starter).

