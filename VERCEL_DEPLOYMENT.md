# MedRelay GitHub and Vercel deployment

MedRelay is a Vite SPA with a Vercel Node Function at `api/trpc/[...trpc].ts`.
The public demo is intentionally unauthenticated, ephemeral, and clinician-review only.

## Push to GitHub

1. Create an empty GitHub repository.
2. From this project root, initialize and commit the source:

   ```powershell
   git init
   git add .
   git commit -m "Prepare MedRelay for Vercel"
   git branch -M main
   git remote add origin https://github.com/<account>/<repository>.git
   git push -u origin main
   ```

   Do not commit `.env`, `node_modules`, `dist`, caches, logs, coverage, or Playwright results.

## Import into Vercel

1. Open Vercel and choose **Add New → Project → Import Git Repository**.
2. Select the GitHub repository and keep the project root at the repository root.
3. The checked-in `vercel.json` supplies the install command, verification build command, Vite output directory, SPA fallback, and catch-all tRPC function.
4. Deploy. Vercel runs `check`, `test`, and `build` as one build gate.

## Build settings

- Framework preset: **Vite**
- Install command: `npx --yes pnpm@10.4.1 install --frozen-lockfile --store-dir .pnpm-store --network-concurrency=1`
- Build command: `npx --yes pnpm@10.4.1 check && npx --yes pnpm@10.4.1 test && npx --yes pnpm@10.4.1 build`
- Output directory: `dist/public`
- Function: `api/trpc/[...trpc].ts`

## Environment variables

Add these under **Project Settings → Environment Variables**. Keep them server-only and never prefix them with `VITE_`.

- `UPSTASH_REDIS_REST_URL` — required for durable cross-instance demo sessions and distributed rate limits. Provision Upstash Redis from Vercel Integrations.
- `UPSTASH_REDIS_REST_TOKEN` — the matching Upstash REST token.
- `OPENAI_API_KEY` — optional; without it, the deterministic/offline demo remains available.
- `OPENAI_SAFETY_IDENTIFIER_SALT` — required when `OPENAI_API_KEY` is set in production; use at least 32 unpredictable characters.
- `OPENAI_MEDICAL_MODEL` — optional; defaults to `gpt-5.6`.

`JWT_SECRET` and `DATABASE_URL` are not required by the public demo.

## Redeploy after adding variables

After saving or changing environment variables, go to **Deployments**, open the latest deployment, and choose **Redeploy**. Select the target environment whose variables you changed. Verify the MedRelay status badge and run a synthetic sample through `/medrelay`.

The app never diagnoses, prescribes, books care, or contacts emergency services. Every generated handoff remains editable and requires clinician review.
