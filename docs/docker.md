# Docker (Development)

Services: `postgres`, `redis`, `backend` (NestJS, hot-reload via bind mount). Flutter is run natively (`flutter run -d chrome` / `-d windows`) during development, not containerized — Docker adds no value to a Flutter dev loop and containerizing it (web target) is reserved for production (`flutter_app/Dockerfile.web`, built by `docker-compose.prod.yml`).

## Commands

```bash
cp .env.example .env.development   # fill in real values
docker compose up -d
docker compose logs -f backend
docker compose ps
docker compose down
docker compose restart backend
```

## First run

```bash
docker compose exec backend npm run migrate:up
docker compose exec backend npm run seed
```

Seed creates `admin@demo.local` / `ChangeMe123!` in a "Demo Organization" — development only, never ship to production.

## Swagger

`http://localhost:3000/api/docs`
