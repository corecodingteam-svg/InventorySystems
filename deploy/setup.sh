#!/usr/bin/env bash
# One-shot setup for advaitamaa.com on a fresh Ubuntu/Debian server. Run as root (or with sudo):
# installs Docker, adds swap if RAM is low, checks DNS, starts the stack, issues
# Let's Encrypt SSL certificates (via Caddy) and creates the first inventory admin.
#
#   ./setup.sh             real Let's Encrypt certificates
#   ./setup.sh --staging   test certificates (browsers will warn) - use first to avoid rate limits
set -euo pipefail
cd "$(dirname "$0")"

DOMAINS=(advaitamaa.com www.advaitamaa.com inventory.advaitamaa.com)
STAGING_CA=https://acme-staging-v02.api.letsencrypt.org/directory
red() { printf '\033[31m%s\033[0m\n' "$*"; }
grn() { printf '\033[32m%s\033[0m\n' "$*"; }

[ "$(id -u)" = 0 ] || { red "Run as root: sudo ./setup.sh"; exit 1; }

# 0. Prerequisites: curl, openssl, Docker + Compose.
if ! command -v curl >/dev/null || ! command -v openssl >/dev/null; then
  apt-get update -y && apt-get install -y curl openssl ca-certificates
fi
if ! command -v docker >/dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null 2>&1 || { red "Docker Compose v2 plugin is missing."; exit 1; }
systemctl enable --now docker >/dev/null 2>&1 || true

# The Flutter web build needs ~2 GB; add a 2 GB swapfile on small servers.
if [ "$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)" -lt 3000 ] && ! swapon --show | grep -q .; then
  echo "Low memory: creating 2 GB swapfile..."
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 1. Environment file
if [ ! -f .env ]; then
  cp .env.example .env
  ADMIN_PW=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)A1
  sed -i.bak "s|CHANGE_ME_long_random_string_64_chars|$(openssl rand -hex 32)|; s|CHANGE_ME_long_random|$(openssl rand -hex 16)|; s|CHANGE_ME_admin_password|$ADMIN_PW|" .env && rm -f .env.bak
  NEW_ENV=1
  grn "Created .env with generated secrets. Review ACME_EMAIL in deploy/.env."
fi
if [ "${1:-}" = "--staging" ]; then
  sed -i.bak "s|^ACME_CA=.*|ACME_CA=$STAGING_CA|" .env && rm -f .env.bak
  echo "Using Let's Encrypt STAGING CA (test certificates)."
else
  sed -i.bak "s|^ACME_CA=.*|ACME_CA=https://acme-v02.api.letsencrypt.org/directory|" .env && rm -f .env.bak
fi

# 2. DNS must already point at this server, or certificate issuance will fail.
SERVER_IP=$(curl -fsS https://api.ipify.org || true)
[ -n "$SERVER_IP" ] || { red "Could not detect this server's public IP."; exit 1; }
echo "Server public IP: $SERVER_IP"
bad=0
for d in "${DOMAINS[@]}"; do
  ip=$(getent hosts "$d" 2>/dev/null | awk '{print $1; exit}' || true)
  if [ "$ip" = "$SERVER_IP" ]; then grn "  OK   $d -> $ip"; else red "  FAIL $d -> ${ip:-no record} (expected $SERVER_IP)"; bad=1; fi
done
[ "$bad" = 0 ] || { red "Fix the DNS A records (see README.md), wait for propagation, then re-run."; exit 1; }

# 3. Firewall: ports 80/443 must be reachable (80 is used for the ACME HTTP challenge).
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp
fi

# 4. Start everything; Caddy requests certificates on first start.
docker compose up -d --build

# 5. Wait for HTTPS to answer on every hostname (certificate issued).
echo "Waiting for SSL certificates (can take up to ~2 minutes)..."
for d in "${DOMAINS[@]}"; do
  ok=0
  for _ in $(seq 1 40); do
    flags=(-fsSIo /dev/null --max-time 5)
    [ "${1:-}" = "--staging" ] && flags+=(-k)
    if curl "${flags[@]}" "https://$d" 2>/dev/null; then ok=1; break; fi
    sleep 5
  done
  if [ "$ok" = 1 ]; then grn "  HTTPS ready: https://$d"; else red "  Not ready: $d - check: docker compose logs caddy"; fi
done

# 6. First inventory admin (idempotent - skipped if the organisation already exists).
echo "Creating first inventory admin..."
docker compose --profile tools run --rm create-admin

echo
grn "Done. Website: https://advaitamaa.com   Inventory: https://inventory.advaitamaa.com"
[ "${1:-}" = "--staging" ] && echo "Staging certs are untrusted. When satisfied, run ./setup.sh (no flag) to get real certificates."
if [ "${NEW_ENV:-}" = 1 ]; then
  echo
  grn "Inventory login:  $(grep ^ADMIN_EMAIL= .env | cut -d= -f2)  /  $(grep ^ADMIN_PASSWORD= .env | cut -d= -f2)"
  echo "(also stored in deploy/.env - change the password after first login)"
fi
echo "Certificates auto-renew; they are stored in the caddy_data volume (do not delete it)."
