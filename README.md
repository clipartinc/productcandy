# Product Candy

Embedded Shopify admin app that gives merchants two tools:

1. **Description Layouts** — pick a polished template, fill in fields, and write
   rich HTML straight into the product description.
2. **Image Resize & Crop** — crop, resize, and re-upload product images
   without leaving the Shopify admin.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Shopify Polaris + App Bridge React
- `@shopify/shopify-api` for OAuth and REST/GraphQL
- Prisma + PostgreSQL (session storage + per-shop data)
- Deployed on Railway

## Local development

```bash
cp .env.example .env          # then fill in values
npm install
npm run db:migrate:dev        # creates the Postgres schema
npm run dev                   # starts on http://localhost:3000
```

You'll need a tunnel (e.g. `cloudflared tunnel --url http://localhost:3000`)
so Shopify can redirect back into your dev machine. Update `HOST` in `.env`
and the **App URL** + **Allowed redirection URL** in your Partner dashboard
to match the tunnel URL.

Install on a dev store by visiting:

```
https://<your-tunnel>/api/auth?shop=<your-store>.myshopify.com
```

## Project layout

```
src/
  app/
    api/auth/route.ts            # OAuth begin
    api/auth/callback/route.ts   # OAuth callback + session storage
    descriptions/page.tsx        # Description Layouts UI
    images/page.tsx              # Image Resize/Crop UI
    layout.tsx                   # App Bridge script + Polaris Provider
    page.tsx                     # Embedded home
    providers.tsx                # Polaris AppProvider
  lib/
    prisma.ts                    # Prisma client singleton
    shopify.ts                   # Shopify API client + session storage
prisma/
  schema.prisma                  # Session, Shop, DescriptionTemplate
```

## Production (Railway)

1. Push this repo to GitHub.
2. Railway → New Project → Deploy from GitHub repo.
3. Add a **PostgreSQL** plugin to the project. Railway injects `DATABASE_URL`.
4. Set the following service variables:
   - `SHOPIFY_API_KEY`
   - `SHOPIFY_API_SECRET`
   - `NEXT_PUBLIC_SHOPIFY_API_KEY` (same value as `SHOPIFY_API_KEY`)
   - `SCOPES=read_products,write_products,read_files,write_files`
   - `HOST=https://<service>.up.railway.app`
5. Set the start command to `npm run db:migrate && npm start`.
6. Update the Shopify Partner app's **App URL** to `$HOST` and
   **Allowed redirection URL(s)** to `$HOST/api/auth/callback`.
