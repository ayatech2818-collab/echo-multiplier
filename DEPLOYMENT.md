# Deployment Guide

Step-by-step instructions for deploying Echo-Multiplier to various platforms.

## Prerequisites

Before deploying, ensure:
- ✅ `npm run build` completes successfully
- ✅ All tests pass (if you've added any)
- ✅ No TypeScript errors
- ✅ Application works locally

## Option 1: Vercel (Recommended)

Vercel is the easiest deployment option for Next.js applications.

### Method A: GitHub Integration (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/echo-multiplier.git
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel auto-detects Next.js settings
   - Click "Deploy"

3. **Done!**
   - Your app is live at `https://your-project.vercel.app`
   - Automatic deployments on every push

### Method B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts
# Production deployment
vercel --prod
```

### Environment Variables (if needed)
- Go to Project Settings → Environment Variables
- Add any required variables
- Redeploy

## Option 2: Netlify

### Method A: Git Integration

1. **Push to GitHub** (same as Vercel)

2. **Deploy on Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub
   - Select your repository
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `.next`
   - Click "Deploy"

### Method B: Netlify CLI

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy

# Production deployment
netlify deploy --prod
```

## Option 3: Static Export (Any Host)

Next.js can export to static HTML for hosting anywhere.

### 1. Configure Static Export

Update `next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

### 2. Build Static Files

```bash
npm run build
```

This creates an `out/` directory with static files.

### 3. Deploy to Any Static Host

**GitHub Pages:**
```bash
# Install gh-pages
npm i -D gh-pages

# Add to package.json scripts:
"deploy": "gh-pages -d out"

# Deploy
npm run deploy
```

**AWS S3:**
```bash
aws s3 sync out/ s3://your-bucket-name --delete
```

**Any Web Server:**
- Upload `out/` directory contents
- Configure server to serve `index.html` for all routes

## Option 4: Docker

### Create Dockerfile

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]
```

### Build and Run

```bash
# Build image
docker build -t echo-multiplier .

# Run container
docker run -p 3000:3000 echo-multiplier
```

### Deploy to Docker Hub

```bash
# Tag image
docker tag echo-multiplier yourusername/echo-multiplier

# Push to Docker Hub
docker push yourusername/echo-multiplier
```

## Option 5: Self-Hosted (Node.js Server)

### 1. Prepare Server

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2
```

### 2. Deploy Application

```bash
# Clone repository
git clone https://github.com/yourusername/echo-multiplier.git
cd echo-multiplier

# Install dependencies
npm ci --production

# Build
npm run build

# Start with PM2
pm2 start npm --name "echo-multiplier" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 3. Configure Nginx (Optional)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. SSL with Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Option 6: Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

## Option 7: Render

1. Go to [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect GitHub repository
4. Settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. Click "Create Web Service"

## Post-Deployment Checklist

After deploying, verify:

- [ ] Application loads correctly
- [ ] File uploads work
- [ ] Canvas rendering works
- [ ] Export functionality works
- [ ] ZIP downloads work
- [ ] All pages are accessible
- [ ] No console errors
- [ ] Mobile responsiveness (if applicable)

## Performance Optimization

### Enable Compression

Most platforms enable this by default, but verify:
- Gzip/Brotli compression enabled
- Static assets cached properly

### CDN Configuration

For static exports, use a CDN:
- Cloudflare (free tier available)
- AWS CloudFront
- Fastly

### Monitoring

Set up monitoring:
- Vercel Analytics (built-in)
- Google Analytics
- Sentry for error tracking

## Custom Domain

### Vercel
1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records as instructed

### Netlify
1. Go to Domain Settings
2. Add custom domain
3. Configure DNS

### Other Platforms
- Update DNS A record to point to server IP
- Configure SSL certificate

## Environment Variables

If you add environment variables later:

```bash
# .env.local (not committed to git)
NEXT_PUBLIC_API_URL=https://api.example.com
```

Update on your platform:
- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Environment Variables
- **Docker**: Pass with `-e` flag or docker-compose

## Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Canvas Not Working

Ensure these libraries are installed:
- `canvas` (for server-side rendering, if needed)
- All peer dependencies

### Large Bundle Size

```bash
# Analyze bundle
npm install -D @next/bundle-analyzer

# Add to next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)

# Run analysis
ANALYZE=true npm run build
```

### Memory Issues

Increase Node.js memory:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

## Rollback

### Vercel
- Go to Deployments
- Click on previous deployment
- Click "Promote to Production"

### Netlify
- Go to Deploys
- Click on previous deploy
- Click "Publish deploy"

### Git-based
```bash
git revert HEAD
git push
```

## Backup

Regular backups recommended:
- Database (if you add one later)
- User-uploaded templates (if you add storage)
- Configuration files

## Security

### Headers

Add security headers in `next.config.ts`:
```typescript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'origin-when-cross-origin',
        },
      ],
    },
  ];
},
```

### HTTPS

Always use HTTPS in production:
- Vercel/Netlify: Automatic
- Self-hosted: Use Let's Encrypt

## Cost Estimates

### Free Tier Options
- **Vercel**: Free for personal projects
- **Netlify**: 100GB bandwidth/month free
- **GitHub Pages**: Free for public repos
- **Railway**: $5 credit/month free

### Paid Options
- **Vercel Pro**: $20/month
- **Netlify Pro**: $19/month
- **AWS**: Pay-as-you-go (~$5-20/month)
- **DigitalOcean**: $6/month droplet

## Support

For deployment issues:
- Check platform documentation
- Review build logs
- Check GitHub Issues
- Contact platform support

## Next Steps

After successful deployment:
1. Set up monitoring
2. Configure custom domain
3. Add analytics (optional)
4. Set up error tracking
5. Create backup strategy
6. Document your deployment process
