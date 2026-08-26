# Deployment Guide — Backend on AWS EC2, Frontend on Vercel

This doc is the one-time manual setup. After you finish it once, every
`git push origin main` that touches `backend/**` auto-redeploys the backend
(GitHub Actions → EC2), and every push auto-redeploys the frontend (Vercel's
default behavior once connected). Nobody needs to SSH in or click "deploy"
manually again after this.

---

## Part A — Backend on EC2 (one-time setup)

### A1. Launch the EC2 instance

1. AWS Console → **EC2** → **Launch instance**
2. Name: `career-path-backend`
3. AMI: **Ubuntu Server 22.04 LTS** (free-tier eligible)
4. Instance type: **t2.micro** (or `t3.micro` — both free-tier eligible on a
   new account's first 12 months)
5. Key pair: **Create new key pair** → name it `career-path-backend-key` →
   type **RSA**, format **.pem** → download it and keep it safe (you cannot
   re-download it later)
6. Network settings → Edit → security group rules:
   - SSH (22) — Source: **My IP** (tighten later; "Anywhere" works but is
     less safe)
   - HTTP (80) — Source: **Anywhere (0.0.0.0/0)** — this is how the API
     will be reached
7. Storage: default 8 GB gp3 is fine
8. **Launch instance**

### A2. Allocate a stable IP (Elastic IP)

EC2's public IP changes if the instance ever restarts — but the GitHub
Actions workflow needs a stable address to SSH into.

1. EC2 → **Elastic IPs** → **Allocate Elastic IP address** → Allocate
2. Select it → **Actions → Associate Elastic IP address** → pick your
   `career-path-backend` instance → Associate
3. **Note this IP down** — it's your `EC2_HOST` secret below, and also your
   backend's public URL (`http://<this-ip>/health`)

### A3. SSH in once and install Docker

From your machine (adjust the path to wherever you downloaded the `.pem`):

```bash
chmod 400 career-path-backend-key.pem
ssh -i career-path-backend-key.pem ubuntu@<ELASTIC_IP>
```

Once connected:

```bash
sudo apt update
sudo apt install -y docker.io
sudo usermod -aG docker ubuntu
# Log out and back in so the group change takes effect:
exit
```

```bash
ssh -i career-path-backend-key.pem ubuntu@<ELASTIC_IP>
docker --version   # confirms it works without sudo
```

### A4. Add swap space (important on a 1 GB instance)

`t2.micro`/`t3.micro` only has **1 GB RAM**. `sentence-transformers` + `torch`
loading the embedding model can spike memory during container startup. A
swap file is cheap insurance against an OOM-killed container:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # confirm swap shows up
```

### A5. Create the real `.env` on the box (never goes through GitHub)

```bash
mkdir -p ~/app
nano ~/app/.env
```

Paste the same 5 keys from your local `backend/.env`:

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
GROQ_API_KEY=...
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X` in nano). This file stays on the
EC2 box only — the deploy workflow mounts it into the container with
`--env-file /home/ubuntu/app/.env`. It is never uploaded, committed, or
passed through GitHub Actions.

You're done with the AWS console/SSH part. `exit` the SSH session.

### A6. Add GitHub repo secrets

GitHub repo → **Settings → Secrets and variables → Actions → New repository
secret**. Add exactly these three:

| Secret name | Value |
|---|---|
| `EC2_HOST` | the Elastic IP from step A2 |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | the **full contents** of `career-path-backend-key.pem` (open the file, copy everything including the `-----BEGIN...` / `-----END...` lines) |

That's it — no AWS access keys go into GitHub. The workflow only ever uses
SSH, not the AWS API, so there's nothing IAM-related to create.

### A7. First deploy

Push anything under `backend/` to `main` (or go to the **Actions** tab →
**Deploy Backend to EC2** → **Run workflow** to trigger it manually the
first time). Watch it in the Actions tab. When it finishes:

```bash
curl http://<ELASTIC_IP>/health
# {"status":"ok","version":"1.0.0"}
```

From then on: **every push to `main` that touches `backend/**` auto-builds,
auto-ships, and auto-restarts the container on EC2** — nothing manual.

---

## Part B — Frontend on Vercel (one-time setup)

Vercel auto-deploys on every push once connected — no workflow file needed,
this is Vercel's default behavior.

1. [vercel.com](https://vercel.com) → **Add New Project** → **Import Git
   Repository** → select this repo
2. Framework Preset: **Vite**
3. **Root Directory: `frontend`**
4. Build Command: `npm run build` · Output Directory: `dist` (Vercel usually
   detects these automatically for a Vite project)
5. Environment Variables:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
   - `VITE_API_URL` = `http://<ELASTIC_IP>` (your EC2 backend from Part A)
6. **Deploy**

After this, every `git push origin main` (from anyone on the team, any
file) triggers a new Vercel deployment automatically — that part needs no
GitHub Actions workflow at all.

Once you have the Vercel URL, go back to Supabase → **Authentication → URL
Configuration** and set:
- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/**`

---

## Day-to-day after setup

```bash
git add backend/...
git commit -m "fix(M1-S4): ..."
git push origin main
# → GitHub Actions builds + ships the new image to EC2 automatically
# → Vercel rebuilds the frontend automatically
# No manual deploy step, ever.
```

## Troubleshooting

- **Workflow fails at the SSH step** — double check `EC2_HOST` is the
  Elastic IP (not the old auto-assigned public IP), and that the security
  group still allows port 22 from GitHub Actions' IP range (if you locked
  SSH to "My IP" instead of Anywhere, GitHub's runners won't be able to
  connect — open 22 to Anywhere, or use a self-hosted runner).
- **Container keeps restarting / health check fails** — SSH in and run
  `docker logs career-path-backend`. The most common cause is a missing or
  malformed `~/app/.env`.
- **Out of memory during model load** — confirm swap is active (`free -h`
  from step A4); consider `t3.small` (2 GB RAM, no longer free-tier) if it
  keeps happening under real traffic.
