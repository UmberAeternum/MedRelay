# Testing

`pnpm test` runs real MedRelay server implementation tests with a mocked provider. Coverage includes safety order, provider bypass on emergency input, negation, multilingual warning signs and injection, schema consistency, semantic boundaries, evidence resolution, session ownership/expiry/reset, corrections, rate limits, honest offline mode, and no automatic booking.

`pnpm check` runs strict TypeScript. `pnpm build` builds the Vite client and bundled Express server. Live paid inference is intentionally excluded from the test suite.

`e2e/medrelay.spec.ts` contains desktop and 360 px Playwright flows for demo start, correction-to-handoff, emergency guidance, injection redirection, evidence/edit/copy/reset, and microphone denial fallback. Browser execution requires `@playwright/test` and a Chromium binary in the execution environment.
