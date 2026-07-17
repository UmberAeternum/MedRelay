# Verification report — READY

Verified 2026-07-16 in a clean Linux workspace using Corepack and pnpm 10.4.1.

## Command results

| Command | Exit | Result |
|---|---:|---|
| `corepack pnpm install --frozen-lockfile --network-concurrency=1` | 0 | Lockfile current; dependencies installed. Transient registry 502s occurred on earlier attempts and were retried. |
| `pnpm check` | 0 | Strict TypeScript completed with no errors. |
| `pnpm test` | 0 | 3 files, 60 tests passed, 0 failed. |
| `pnpm build` | 0 | Vite client and bundled Express server built successfully without warnings. |
| Production HTTP smoke flow | 0 | `/medrelay`, status, session start, patient message, safety state, and honest offline response verified. |
| `pnpm exec playwright test` | 254 | Environment-only: Playwright runner/browser is not installed. The 5-scenario suite is implemented for 2 projects (10 configured executions). |

## P0/P1/P2 mapping

- **P0 — safety and trust:** one shared server pipeline; patient-only deterministic screening before provider; emergency provider bypass; negation/multilingual cases; server-controlled history; strict Zod output; semantic boundaries; deterministic urgency precedence; evidence resolution; generic errors; no unsafe routes.
- **P1 — judge-ready product:** public ephemeral demo, synthetic labels/scenarios, honest live/offline state, reset, rate limit, evidence/edit/copy UI, correction handling, typed voice fallback, 360 px design, focused home route.
- **P2 — engineering and submission:** strict TypeScript, real mocked-provider tests, code splitting, 1 MB request limit, origin checks, production salt enforcement, stale claim cleanup, deployment/testing/judge documentation, secret scan, source-only archive.

## Test inventory

- `safety.test.ts`: 21
- `validation.test.ts`: 22
- `service.test.ts`: 17
- Total: **60 passing tests in 3 files**
- E2E source: 5 scenarios across desktop and 360 px projects; browser execution not verified in this container.

## GPT status

The source uses the OpenAI Responses API, default model `gpt-5.6`, `store: false`, a server-held developer instruction, strict Zod Structured Outputs, and an HMAC `safety_identifier`. No `OPENAI_API_KEY` was present, so **live GPT-5.6 inference was not verified and is not claimed**. Mocked provider paths and honest missing-key behavior are verified by tests.

## Security and archive

Secret scan found no API keys, tokens, private keys, credentials, logs, or patient records. `.env.example` contains names only. The final archive excludes `.env`, `node_modules`, `dist`, coverage, browser artifacts, caches, logs, `.git`, and generated medical data.

## Remaining limitations

- Demo sessions are in-memory, single-instance, non-durable hackathon infrastructure.
- Deterministic phrase rules are precautionary and not clinically validated.
- Prompt-injection controls reduce risk but do not claim perfect immunity.
- Live provider inference requires server environment configuration.
- Browser E2E execution requires a Playwright runner and browser binary; source coverage is present but was not falsely reported as passed.
