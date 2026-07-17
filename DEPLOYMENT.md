# Vercel deployment

## Environment

- `OPENAI_API_KEY` — optional; without it the honest offline demo remains usable.
- `OPENAI_MEDICAL_MODEL` — optional, defaults to `gpt-5.6`.
- `OPENAI_SAFETY_IDENTIFIER_SALT` — required only with `OPENAI_API_KEY`; use at least 32 unpredictable characters.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — required for reliable cross-instance demo sessions.

Provision Upstash Redis from **Vercel Dashboard → Project → Integrations → Upstash Redis**. Vercel injects both Redis values automatically. Add OpenAI values under **Project → Settings → Environment Variables** as sensitive production variables. The public demo does not use `JWT_SECRET` or `DATABASE_URL`.

The repository includes `vercel.json`. Vercel builds the Vite client into `dist/public`, deploys `api/trpc/[...trpc].ts` as the catch-all Node Function for tRPC, and applies the SPA fallback for `/` and `/medrelay`.

The Vercel API entry point is serverless and does not start a Node HTTP listener. Never place secret values in client variables or source control.
