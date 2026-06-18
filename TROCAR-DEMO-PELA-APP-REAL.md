# Trocar demo pela app real

Este repositorio ja tem deploy automatico funcionando:

```text
GitHub Actions -> GHCR -> Oracle VPS -> Docker Compose -> Caddy
```

URL atual:

```text
http://147.15.51.149/
```

## O que manter

Mantenha estes arquivos:

```text
.github/workflows/deploy.yml
Dockerfile
.dockerignore
```

O workflow ja:

```text
1. Builda a imagem Docker
2. Publica no GHCR
3. Entra na VPS por SSH
4. Atualiza /opt/minha-app/.env
5. Roda docker compose pull
6. Roda docker compose up -d
7. Valida http://127.0.0.1/health na VPS
```

## O que trocar

Substitua os arquivos da demo pelos arquivos da app real:

```text
server.js
package.json
package-lock.json
README.md
```

Se a app real nao for Node.js, ajuste o `Dockerfile`.

## Requisitos da app real

A app real deve:

```text
Escutar na porta 3000 dentro do container
Responder GET /health com status 200
Responder GET / com a pagina principal
```

Se a porta interna for diferente, atualize:

```text
/opt/minha-app/docker-compose.yml
/opt/minha-app/Caddyfile
```

Ou ajuste a app para usar `PORT=3000`.

## Deploy

Depois de trocar os arquivos:

```powershell
git add .
git commit -m "Substitui demo pela app real"
git push origin main
```

O GitHub Actions dispara sozinho.

## Validar

```text
GitHub -> Actions -> Deploy to Oracle VPS
http://147.15.51.149/
http://147.15.51.149/health
```

## Se falhar

O workflow imprime:

```text
docker compose ps
docker compose logs --tail=120
```

Na VPS tambem existe watchdog:

```text
systemctl status minha-app-watchdog.timer
sudo tail -80 /var/log/minha-app-watchdog.log
```
