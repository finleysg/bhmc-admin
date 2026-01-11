# Deployment Guide: CapRover + GitHub Actions

This guide covers deploying the BHMC Admin monorepo to a Digital Ocean droplet using CapRover.

---

## System Architecture

### Current State

| Service   | URL           | Stack                              | Hosting                   |
| --------- | ------------- | ---------------------------------- | ------------------------- |
| BHMC Web  | bhmc.org      | React SPA                          | Firebase                  |
| BHMC Data | data.bhmc.org | Django + DRF, Celery, Redis, nginx | DO Droplet (Ubuntu 24.04) |
| MySQL     | -             | Managed database                   | DO Managed Database       |

**External Services:**

- AWS S3 - documents and photos
- Mailgun - transactional email
- Stripe - payments

### New State (Post-Migration)

| Service        | URL            | Stack               | Hosting      | Changes                                               |
| -------------- | -------------- | ------------------- | ------------ | ----------------------------------------------------- |
| BHMC Web       | bhmc.org       | React SPA           | **CapRover** | Remove admin routes, move from Firebase               |
| BHMC Data      | data.bhmc.org  | Django + DRF, nginx | DO Droplet   | Remove Celery/Redis, becomes simple REST API          |
| **BHMC API**   | api.bhmc.org   | NestJS              | **CapRover** | New - Golf Genius, Stripe callbacks, registration SSE |
| **BHMC Admin** | admin.bhmc.org | Next.js             | **CapRover** | New - admin UX (players, Golf Genius, reporting)      |

**Architecture Diagram:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DO CapRover Droplet                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │  BHMC Web   │  │  BHMC API   │  │ BHMC Admin  │                  │
│  │  (React)    │  │  (NestJS)   │  │  (Next.js)  │                  │
│  │  bhmc.org   │  │api.bhmc.org │  │admin.bhmc.org                  │
│  └─────────────┘  └──────┬──────┘  └─────────────┘                  │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  BHMC Data    │  │ DO Managed    │  │   External    │
│  (Django)     │  │    MySQL      │  │   Services    │
│data.bhmc.org  │  │               │  │ S3/Mailgun/   │
│               │  │               │  │    Stripe     │
└───────────────┘  └───────────────┘  └───────────────┘
```

**This Repo (bhmc-admin):**

- `apps/api` - BHMC API: Golf Genius integration, Stripe callbacks, registration flow with SSE
- `apps/web` - BHMC Admin: Player management, Golf Genius UI, reporting, light club management

### Future Roadmap

- Multi-tenancy support
- SaaS subscription model for other golf clubs

---

## Deployment Pipeline

```
GitHub (release tag) → GitHub Actions → CapRover → DO Droplet
                                              ├── bhmc-api (NestJS)
                                              └── bhmc-web (Next.js)
```

- **Trigger**: Creating a release tag (e.g., `v1.0.0`)
- **CI/CD**: GitHub Actions builds and deploys via CapRover CLI
- **Platform**: CapRover (self-hosted PaaS using Docker Swarm)
- **Database**: External managed MySQL (not on droplet)

---

## Prerequisites

- Digital Ocean droplet (Ubuntu 22.04+, min 2GB RAM)
- Domain with DNS access
- GitHub repository with Actions enabled
- External MySQL database (DO Managed Database or similar)

---

## Phase 1: Install CapRover on Droplet

### 1.1 Prepare Droplet

SSH into your droplet:

```bash
ssh root@YOUR_DROPLET_IP
```

apt update and apt upgrade, then reboot

Install Docker if not present:

```bash
curl -fsSL https://get.docker.com | sh
```

Open required ports (if using UFW):

```bash
ufw allow 80,443,3000/tcp
```

### 1.2 Install CapRover

```bash
docker run -p 80:80 -p 443:443 -p 3000:3000 \
  -e ACCEPTED_TERMS=true \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /captain:/captain \
  caprover/caprover
```

Wait ~60 seconds for CapRover to initialize.

### 1.3 Configure CapRover

Install CLI locally:

```bash
npm install -g caprover
```

Run server setup:

```bash
caprover serversetup
```

Prompts:

- **IP address**: Your droplet IP
- **Root domain**: e.g., `yourdomain.com` (requires DNS configured)
- **New password**: Set a secure password
- **Email for SSL**: Your email (Let's Encrypt notifications)

### 1.4 DNS Configuration

Add these DNS records pointing to your droplet IP:

| Type | Name    | Value                                 |
| ---- | ------- | ------------------------------------- |
| A    | @       | DROPLET_IP                            |
| A    | captain | DROPLET_IP                            |
| A    | api     | DROPLET_IP                            |
| A    | \*.api  | DROPLET_IP (optional, for subdomains) |

Wait for DNS propagation (~5-30 minutes).

### 1.5 Access CapRover Dashboard

Navigate to `https://captain.yourdomain.com` and log in.

---

## Phase 2: Create CapRover Apps

In CapRover dashboard:

### 2.1 Create API App

1. Click "Apps" → "Create New App"
2. App name: `bhmc-api`
3. Check "Has Persistent Data" if needed (usually not for stateless API)
4. Click "Create New App"

Configure the app:

- **HTTP Settings** → Custom domain: `api.yourdomain.com`
- **Enable HTTPS** → Click "Enable HTTPS"
- **App Configs** → Environment Variables:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://user:pass@managed-db-host:25060/dbname?ssl={"rejectUnauthorized":true}
# Add other env vars from apps/api/.env.example
```

### 2.2 Create Web App

1. Click "Apps" → "Create New App"
2. App name: `bhmc-admin`
3. Click "Create New App"

Configure the app:

- **HTTP Settings** → Custom domain: `yourdomain.com` or `app.yourdomain.com`
- **Enable HTTPS** → Click "Enable HTTPS"
- **App Configs** → Environment Variables:

```
NODE_ENV=production
PORT=3000
API_URL=https://api.bhmc.org
# Add other env vars from apps/web/.env.example
```

---

## Phase 3: GitHub Configuration

### 3.1 Add Repository Secrets

Go to GitHub repo → Settings → Secrets and variables → Actions.

Add these secrets:

| Secret              | Value                  |
| ------------------- | ---------------------- |
| `CAPROVER_PASSWORD` | Your CapRover password |

Add these variables:

| Secret               | Value                                         |
| -------------------- | --------------------------------------------- |
| `CAPROVER_URL`       | `https://captain.captain.mycaptain.bhmc.org/` |
| `CAPROVER_API_APP`   | `bhmc-api`                                    |
| `CAPROVER_ADMIN_APP` | `bhmc-admin`                                  |

### 3.2 Workflow File

The workflow at `.github/workflows/deploy.yml` handles deployment:

- Triggers on tags matching `v*`
- Builds and deploys both apps in parallel
- Uses CapRover CLI for deployment

---

## Phase 4: Deploy

### 4.1 Create Release Tag

```bash
git tag v1.0.0
git push origin v1.0.0
```

### 4.2 Monitor Deployment

1. Go to GitHub repo → Actions tab
2. Watch the "Deploy to CapRover" workflow
3. Each app deploys independently

### 4.3 Verify

- API: `https://api.yourdomain.com/health`
- Web: `https://yourdomain.com`

---

## Scaling

### Vertical Scaling (Scale Up)

Resize your DO droplet:

1. Power off droplet in DO dashboard
2. Resize to larger size
3. Power on
4. CapRover continues running - no config changes needed

### Horizontal Scaling (Scale Out)

CapRover uses Docker Swarm for clustering.

**Add worker node:**

1. Create another droplet with Docker installed
2. In CapRover dashboard → Cluster → "Add Self-Hosted Registry"
3. Run the join command on the new node

**Scale app replicas:**

1. Go to app in CapRover dashboard
2. App Configs → Instance Count
3. Increase replica count

**Note**: For horizontal scaling, ensure your apps are stateless. With external managed DB, this should work out of the box.

---

## Rollback

### Via CapRover Dashboard

1. Go to app → Deployment tab
2. Find previous successful deployment
3. Click "Revert to this version"

### Via Git Tag

```bash
# Deploy specific version
git checkout v1.0.0
git tag v1.0.1  # Create new tag from old code
git push origin v1.0.1
```

---

## Troubleshooting

### View App Logs

CapRover dashboard → App → Logs tab

Or via CLI:

```bash
caprover api --caproverUrl https://captain.yourdomain.com \
  --caproverPassword YOUR_PASSWORD \
  --path /user/apps/appData/bhmc-api
```

### SSH into App Container

```bash
# On droplet
docker ps  # Find container ID
docker exec -it CONTAINER_ID sh
```

### Build Failures

Check GitHub Actions logs. Common issues:

- Missing dependencies in Dockerfile
- TypeScript errors
- Environment variables not set

### App Won't Start

Check CapRover logs for the app. Common issues:

- Port mismatch (app must listen on `PORT` env var or 3000)
- Missing environment variables
- Database connection issues

### SSL Certificate Issues

1. Ensure DNS is properly configured
2. Try removing and re-enabling HTTPS in CapRover
3. Check Let's Encrypt rate limits

---

## Files Reference

| File                           | Purpose                               |
| ------------------------------ | ------------------------------------- |
| `apps/api/Dockerfile`          | Production build for API              |
| `apps/web/Dockerfile`          | Production build for Web              |
| `apps/api/captain-definition`  | CapRover config for API               |
| `apps/web/captain-definition`  | CapRover config for Web               |
| `.github/workflows/deploy.yml` | GitHub Actions workflow               |
| `apps/web/next.config.ts`      | Next.js config with standalone output |

---

## Local Testing

Test Docker builds locally before deploying:

```bash
# Build API
docker build -t bhmc-api -f apps/api/Dockerfile .

# Build Web
docker build -t bhmc-web -f apps/web/Dockerfile .

# Run API
docker run -p 3000:3000 --env-file apps/api/.env bhmc-api

# Run Web
docker run -p 3300:3000 --env-file apps/web/.env bhmc-web
```
