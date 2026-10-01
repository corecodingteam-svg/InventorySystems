# Deploying advaitamaa.com

| URL | Serves |
| --- | --- |
| https://advaitamaa.com | Marketing website (`nexora-website/`) |
| https://www.advaitamaa.com | Redirects to https://advaitamaa.com |
| https://inventory.advaitamaa.com | Inventory web app + API (`/api/v1`) |

HTTPS certificates (Let's Encrypt) are issued during setup and renewed automatically by Caddy.

## 1. DNS (at your domain registrar)

Replace `YOUR_SERVER_IP` with the VPS public IPv4 address.

| Type | Host / Name | Value | TTL |
| --- | --- | --- | --- |
| A | `@` (advaitamaa.com) | `YOUR_SERVER_IP` | 300 |
| A | `www` | `YOUR_SERVER_IP` | 300 |
| A | `inventory` | `YOUR_SERVER_IP` | 300 |
| AAAA (only if the server has IPv6) | `@`, `www`, `inventory` | `YOUR_SERVER_IPV6` | 300 |

Remove any conflicting parking/forwarding records on `@`, `www` and `inventory`.
Wait until `dig +short advaitamaa.com` and `dig +short inventory.advaitamaa.com` return the server IP **before** starting the stack, otherwise certificate issuance fails.

Optional email records (only if you use email on this domain): MX records from your mail provider, plus SPF/DKIM/DMARC TXT records they give you.

## 2. Server

Ubuntu 22.04+ VPS (2 GB RAM minimum — the Flutter web build needs memory), ports 80/443 open (`ufw allow 80,443/tcp && ufw allow 443/udp`).

```bash
git clone <repo-url> app && cd app/deploy
sudo ./setup.sh --staging     # optional dry run with test certificates (avoids Let's Encrypt rate limits)
sudo ./setup.sh               # real certificates
```

`setup.sh` is the single script for the whole setup: installs Docker, adds swap on small servers, creates `.env` with random secrets (check `ACME_EMAIL`), verifies all three DNS records point at this server, opens the firewall, starts the stack, waits for Let's Encrypt HTTPS on every hostname and creates the first inventory admin (login printed at the end). Certificates are renewed automatically and live in the `caddy_data` volume - never delete it. Let's Encrypt allows only a few failed validations per hour, so fix DNS first.

The `migrate` service applies database migrations automatically on every `up`.

## 3. First admin user

Created by `setup.sh` from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `deploy/.env` (no demo data; the dev seed is never used). To create it manually later: `docker compose --profile tools run --rm create-admin`.

## 4. Operations

```bash
docker compose logs -f caddy backend      # logs
docker compose up -d --build website      # redeploy the website only
docker compose exec postgres pg_dump -U inventory inventory > backup.sql   # backup
```

Postgres and Redis are not published to the host. Swagger (`/api/docs`) is blocked on the public domain.
