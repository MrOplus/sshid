<div align="center">

# sshid

**Passkeys for SSH — fetch all your public keys with a single handle.**

`curl https://sshid.koorosh.me/alex >> ~/.ssh/authorized_keys`

Open-source · self-hostable · no daemons, no agents, just standard SSH.

[![CI](https://github.com/mroplus/sshid/actions/workflows/ci.yml/badge.svg)](https://github.com/mroplus/sshid/actions/workflows/ci.yml)
[![Deploy](https://github.com/mroplus/sshid/actions/workflows/deploy.yml/badge.svg)](https://github.com/mroplus/sshid/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-2dd4bf.svg)](LICENSE)

</div>

---

## What is it?

SSHID gives every person a single handle that resolves to all of their SSH
**public** keys. Add a key on each of your devices, then pull them onto any
server with one command:

```bash
curl -fsSL https://sshid.koorosh.me/alex >> ~/.ssh/authorized_keys
```

Keys are managed behind **passkeys (WebAuthn)** — registration and sign-in use
Face ID, Touch ID or Windows Hello. There are no passwords, and private SSH keys
never leave your devices. Only public keys are ever published.

This is a clean-room, open-source SSH identity service that you can self-host.

## Features

- 🔑 **One handle, every key.** `GET /<handle>` returns an `authorized_keys` file.
- 🧭 **Content negotiation.** Browsers get a polished profile page; `curl`/`wget`
  get plain text. Append `.keys` or `?format=txt` to force plain text.
- 🛡️ **Passkey auth.** Phishing-resistant WebAuthn for register and login.
- ✨ **In-browser key generation.** Mint an Ed25519 key with Web Crypto; the
  private key is shown once and never touches the server, the public key is added
  automatically.
- 🧩 **Modern key types.** Ed25519, ECDSA, RSA and FIDO `sk-*` keys, validated on
  the wire and fingerprinted (SHA256).
- 🪶 **Single container.** Node + SQLite. No external services required.
- ♻️ **Built for production.** Graceful shutdown, WAL-mode SQLite, rate limiting,
  hardened headers and a strict CSP.

## Architecture

```
apps/
├── server/   Fastify + TypeScript API and static host
│   ├── db/        SQLite (WAL) connection, migrations, repositories
│   ├── lib/       ssh-key parsing, signed tokens, sessions, WebAuthn
│   ├── plugins/   security middleware, auth guard, SPA + resolver
│   └── routes/    auth, keys, public profile, health
└── web/      React + Vite + Tailwind single-page app
    ├── pages/     landing, login, register, dashboard, profile
    └── components/ shared UI
```

The server serves the built SPA and owns the root `/:handle` resolver. In
production both workspaces are compiled and shipped in one Docker image.

### Concurrency & resource management

- **One SQLite handle**, opened in WAL mode with `busy_timeout`, `foreign_keys`
  and a bounded page cache. better-sqlite3 is synchronous and internally
  serialised, so readers never block the single writer and there is no pool to
  leak.
- **Prepared statements** are compiled once and reused for the process lifetime.
- **Graceful shutdown** on `SIGINT`/`SIGTERM`: the HTTP server drains in-flight
  requests, then the WAL is checkpointed and the database closed cleanly.
- **Rate limiting** globally and tightened on auth ceremonies.
- **Bounded inputs**: request body limit, request timeout, and hard caps on key
  size.

## Quick start (local)

Requires Node 20+.

```bash
npm install
cp .env.example .env          # set SESSION_SECRET (openssl rand -hex 32)
npm run dev                   # web on :5173 (proxied), API on :8080
```

Open http://localhost:5173. For passkeys, `RP_ID=localhost` works out of the box.

### Production build

```bash
npm run build
node apps/server/dist/index.js
```

### Docker

```bash
SESSION_SECRET=$(openssl rand -hex 32) \
PUBLIC_ORIGIN=https://sshid.example RP_ID=sshid.example \
docker compose up -d --build
```

## Configuration

| Variable         | Default                  | Description                                            |
| ---------------- | ------------------------ | ------------------------------------------------------ |
| `HOST`           | `0.0.0.0`                | Bind address.                                          |
| `PORT`           | `8080`                   | Listen port.                                           |
| `PUBLIC_ORIGIN`  | `http://localhost:8080`  | Public URL (no trailing slash). Used for WebAuthn.     |
| `RP_ID`          | `localhost`              | WebAuthn relying-party ID — the registrable domain.    |
| `RP_NAME`        | `SSHID`                  | Display name shown in passkey prompts.                 |
| `SESSION_SECRET` | _required in prod_       | ≥32-char secret for signing cookies.                   |
| `DATABASE_PATH`  | `./data/sshid.sqlite`    | SQLite file location.                                  |
| `LOG_LEVEL`      | `info`                   | `debug` \| `info` \| `warn` \| `error`.                |

## API

| Method   | Path                          | Description                                  |
| -------- | ----------------------------- | -------------------------------------------- |
| `GET`    | `/:handle`                    | `authorized_keys` (text) or profile (HTML).  |
| `GET`    | `/:handle.keys`               | Always plain text.                           |
| `GET`    | `/api/u/:handle`              | Public profile as JSON.                      |
| `GET`    | `/api/auth/me`                | Current session.                             |
| `POST`   | `/api/auth/register/options`  | Begin passkey registration.                  |
| `POST`   | `/api/auth/register/verify`   | Complete registration.                       |
| `POST`   | `/api/auth/login/options`     | Begin passkey login.                         |
| `POST`   | `/api/auth/login/verify`      | Complete login.                              |
| `POST`   | `/api/auth/logout`            | Clear session.                               |
| `GET`    | `/api/keys`                   | List your keys _(auth)_.                     |
| `POST`   | `/api/keys`                   | Add a key _(auth)_.                          |
| `DELETE` | `/api/keys/:id`               | Remove a key _(auth)_.                       |
| `GET`    | `/healthz`                    | Liveness probe.                              |

## Deployment & CI/CD

The live instance runs as a **Portainer Git stack** that builds the image on the
host from this repository.

**Continuous deployment** is driven by Portainer's Git polling: the stack checks
this repo every 5 minutes and automatically rebuilds and redeploys whenever
`main` advances. This needs no inbound connection to the host, so it works even
when Portainer sits behind a WAF/Cloudflare.

Pushing to `main` runs [`deploy.yml`](.github/workflows/deploy.yml):

1. **Build & push** a container image to `ghcr.io/mroplus/sshid` (published
   artifact, also usable with `docker-compose.prod.yml`).
2. **Redeploy** — a best-effort call to the Portainer API for an immediate
   rollout. It is marked `continue-on-error` because GitHub-hosted runner IPs may
   be blocked by the host's WAF; Git polling remains the reliable fallback.

Required repository secrets (for the best-effort fast-path):

| Secret                  | Example                          |
| ----------------------- | -------------------------------- |
| `PORTAINER_URL`         | `https://portainer.koorosh.me`   |
| `PORTAINER_API_KEY`     | `ptr_…`                          |
| `PORTAINER_STACK_ID`    | `16`                             |
| `PORTAINER_ENDPOINT_ID` | `3`                              |

The instance is reached at **https://sshid.koorosh.me** through the host's
Cloudflare Tunnel, which maps the public hostname to the container's host port
(`3008`). Because `RP_ID`/`PUBLIC_ORIGIN` are domain-bound for WebAuthn, the
public hostname must point at the container for passkeys to work.

## License

[MIT](LICENSE) © SSHID contributors.
