# Environment variables sync with Vercel

To ensure `.env.local` matches Vercel project environment variables.

**Required for admin auth:** `ADMIN_USERNAME`, `ADMIN_PASSWORD` – add these in Vercel Dashboard if not present.

```bash
pnpm env:pull
```

This runs `vercel env pull .env.local` and fetches all env vars from your linked Vercel project into `.env.local`.

**Verify sync:**
```bash
pnpm check-env
```

**Prerequisites:**
- [Vercel CLI](https://vercel.com/docs/cli) installed (`npm i -g vercel`)
- Project linked to Vercel (`vercel link` if not already)
