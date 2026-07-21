# MedRelay

MedRelay is a multilingual, AI-assisted patient-to-clinician handoff demo. It accepts Telugu, Hindi, English, and mixed-language statements, applies patient-only deterministic safety screening, and creates an editable draft with per-field evidence references.

It is not a diagnostic, prescribing, treatment, booking, clinician-review, or emergency-dispatch system. Use synthetic data in the public demo.

## Run

```bash
npx --yes pnpm@10.4.1 install --frozen-lockfile
npx --yes pnpm@10.4.1 check
npx --yes pnpm@10.4.1 test
npx --yes pnpm@10.4.1 build
npx --yes pnpm@10.4.1 dev
```

Open `/medrelay`. The public demo is a zero-cost deterministic intake engine: `MEDRELAY_LIVE_PROVIDER=false` is the default and prevents external AI/provider calls, even if a stale key exists. It performs deterministic emergency screening, category-aware multilingual follow-up, ephemeral sessions, evidence validation, and an editable clinician-review draft. It never diagnoses, prescribes, books care, claims clinician review, or dispatches emergency services.

The optional OpenAI Responses API integration is server-only and requires authorized quota plus explicit `MEDRELAY_LIVE_PROVIDER=true`. Live inference is not enabled or claimed in the public demo. A deterministic response must never be described as GPT-5.6 output, and `OPENAI_API_KEY` must never be exposed to the browser.

Submission wording: MedRelay is a zero-cost safety-focused demo with validated deterministic fallback behavior. GPT-5.6 integration is implemented but live inference is disabled because no API quota is available.

See `DEPLOYMENT.md`, `SAFETY.md`, and `VERIFICATION_REPORT.md`.
