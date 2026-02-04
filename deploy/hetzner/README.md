# Deploy en Hetzner (sin dominio)

## 1) Crear servidor
- OS recomendado: Ubuntu 22.04 LTS.
- Tamaño recomendado para MVP: **CX23 (2 vCPU, 4 GB RAM, 40 GB SSD)**.

## 2) Firewall (Hetzner Cloud)
Crea un Firewall y abre:
- `22/tcp` (SSH)
- `80/tcp` (HTTP)
- `443/tcp` (HTTPS)
- `3000/tcp` (Web) **solo temporal si no hay reverse proxy**
- `4000/tcp` (API) **solo temporal si no hay reverse proxy**

## 3) Instalación de Docker
Conéctate por SSH y ejecuta:

```bash
apt update
apt install -y ca-certificates curl gnupg
curl -fsSL https://get.docker.com | sh
```

## 4) Clonar repo y configurar env

```bash
git clone https://github.com/alvaroimpulsax-droid/jobtrackercodex.git
cd jobtrackercodex/deploy/hetzner
cp .env.example .env
```

Edita `.env` con tus secretos (JWT, S3, etc).

## 5) Levantar servicios

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

La web quedará disponible en:
- `http://SERVER_IP:3000`
- API en `http://SERVER_IP:4000`

## 6) Bootstrap del primer tenant

```bash
curl -X POST http://SERVER_IP:4000/tenants/bootstrap \
  -H "x-bootstrap-secret: TU_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"tenantName":"Demo","ownerEmail":"admin@demo.es","ownerName":"Admin","ownerPassword":"12345678"}'
```

## 7) Siguiente paso (con dominio)
Cuando tengas dominio:
- añadimos un reverse proxy (Caddy/Nginx) con SSL
- cerramos 3000/4000 y dejamos solo 80/443

