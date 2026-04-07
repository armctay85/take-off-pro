# Deploy to Vercel (Zero-Token Method)

## Option 1: Vercel CLI (Recommended)
```bash
# 1. Install Vercel CLI (if not already)
npm i -g vercel

# 2. Login (opens browser - no token needed)
vercel login

# 3. Deploy this folder
vercel --prod
```

## Option 2: Vercel Git Integration
1. Push this folder to GitHub
2. Connect repo at https://vercel.com/new
3. Vercel auto-deploys on every push

## Option 3: Vercel Zip Upload
1. Zip this folder
2. Go to https://vercel.com/new
3. Drag & drop the zip

## Environment Variables Required
Set these in Vercel dashboard:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Random 32+ char string
- `JWT_SECRET` - Random 32+ char string (different from SESSION_SECRET)
- `REPL_ID` - Any identifier (e.g., "develoop-prod")

## Pre-Deployment Security Checklist
- [ ] Changed admin password from 'pass'
- [ ] Set strong JWT_SECRET (32+ chars)
- [ ] Enabled rate limiting
- [ ] Restricted CORS origins

## Build Output
- Frontend: `dist/public/` (static)
- Backend: `dist/index.js` (Node.js)

## Local Test Before Deploy
```bash
npm install
npm run build
npm start
```
