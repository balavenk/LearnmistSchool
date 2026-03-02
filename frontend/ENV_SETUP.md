# Environment Configuration Guide

## Overview

The frontend application uses environment-specific configuration files to manage different deployment environments (development, staging, production).

## Environment Files

### `.env.development`
Used for local development when running `npm run dev`.
- API URL: `http://localhost:8000`
- WebSocket URL: `ws://localhost:8000`

### `.env.staging`
Used for staging deployments when running `npm run build:staging`.
- **Update these URLs** with your actual staging server URLs
- Example: `https://api-staging.learnmist.com`

### `.env.production`
Used for production builds when running `npm run build` or `npm run build:prod`.
- **Update these URLs** with your actual production server URLs
- Example: `https://api.learnmist.com`

### `.env.example`
Template file showing all available environment variables.
- Use this as reference when setting up new environments
- **Do not** put real URLs or secrets here

### `.env.local` (not committed)
For local overrides and testing.
- Create this file locally if you need different settings
- This file is in `.gitignore` and won't be committed
- Takes precedence over other `.env` files

## Available Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend REST API base URL | `http://localhost:8000` |
| `VITE_WS_URL` | WebSocket server base URL | `ws://localhost:8000` |

> **Note:** All environment variables exposed to the client must be prefixed with `VITE_` for Vite to include them in the build.

## Build Commands

```bash
# Development (uses .env.development)
npm run dev

# Production build (uses .env.production)
npm run build
npm run build:prod

# Staging build (uses .env.staging)
npm run build:staging
```

## How It Works

1. **Configuration Module** ([src/config/api.ts](src/config/api.ts))
   - Centralized configuration for all API settings
   - Reads from `import.meta.env.VITE_*` variables
   - Provides helper functions like `getWebSocketUrl()`

2. **Axios Instance** ([src/api/axios.ts](src/api/axios.ts))
   - Pre-configured axios instance with base URL
   - Automatically adds JWT token to requests
   - Handles 401 errors and redirects to login

3. **Component Usage**
   ```typescript
   // ✅ GOOD - Uses centralized API instance
   import api from '../../api/axios';
   
   const data = await api.get('/teacher/classes/');
   // Token is added automatically!
   
   // ✅ GOOD - WebSocket connections
   import { getWebSocketUrl } from '../../config/api';
   
   const wsUrl = getWebSocketUrl('/upload/ws/train/123');
   const socket = new WebSocket(wsUrl);
   ```

   ```typescript
   // ❌ BAD - Hardcoded URLs
   const data = await axios.get('http://localhost:8000/teacher/classes/', {
       headers: { Authorization: `Bearer ${token}` }
   });
   ```

## Deployment Guide

### For Staging Deployment

1. Update `.env.staging` with your staging URLs:
   ```env
   VITE_API_URL=https://api-staging.yourdomain.com
   VITE_WS_URL=wss://api-staging.yourdomain.com
   ```

2. Build for staging:
   ```bash
   npm run build:staging
   ```

3. Deploy the `dist/` folder to your staging server

### For Production Deployment

1. Update `.env.production` with your production URLs:
   ```env
   VITE_API_URL=https://api.yourdomain.com
   VITE_WS_URL=wss://api.yourdomain.com
   ```

2. Build for production:
   ```bash
   npm run build:prod
   ```

3. Deploy the `dist/` folder to your production server

## Docker Deployment

When using Docker, you can override environment variables at runtime:

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build with environment-specific config
ARG VITE_API_URL
ARG VITE_WS_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

```bash
# Build with custom URLs
docker build --build-arg VITE_API_URL=https://api.example.com \
             --build-arg VITE_WS_URL=wss://api.example.com \
             -t learnmist-frontend .
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
        working-directory: ./frontend
      
      - name: Build for production
        run: npm run build:prod
        working-directory: ./frontend
        env:
          VITE_API_URL: ${{ secrets.PROD_API_URL }}
          VITE_WS_URL: ${{ secrets.PROD_WS_URL }}
      
      - name: Deploy
        # Add your deployment steps here
```

## Troubleshooting

### API calls failing after deployment

**Problem:** App still trying to connect to `localhost:8000`

**Solution:** 
1. Verify you ran build with correct environment: `npm run build:staging` or `npm run build:prod`
2. Check that `.env.staging` or `.env.production` has correct URLs
3. Clear browser cache and hard reload (Ctrl+Shift+R)

### Environment variables not updating

**Problem:** Changed `.env` file but nothing happened

**Solution:**
1. **Development:** Restart dev server (`npm run dev`)
2. **Production:** Rebuild the app (`npm run build:prod`)
3. Vite only reads env files at build time, not runtime

### WebSocket connections failing

**Problem:** WebSocket shows "Connection refused"

**Solution:**
1. Verify `VITE_WS_URL` is set correctly
2. Use `wss://` for HTTPS sites, `ws://` for HTTP
3. Check CORS and WebSocket proxy settings in backend

## Best Practices

1. ✅ **Always use the `api` instance** from `src/api/axios.ts`
2. ✅ **Use `getWebSocketUrl()`** for WebSocket connections
3. ✅ **Never commit `.env.local`** (already in .gitignore)
4. ✅ **Update staging/production URLs** before deployment
5. ✅ **Test each environment** before deploying to production
6. ❌ **Never hardcode URLs** like `http://localhost:8000`
7. ❌ **Never commit secrets** to environment files

## Support

For issues or questions about environment configuration, check:
- [Vite Environment Variables Documentation](https://vitejs.dev/guide/env-and-mode.html)
- Project maintainers
