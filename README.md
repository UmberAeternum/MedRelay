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

Open `/medrelay`. The public demo is configured for ₹0 mode by default: `MEDRELAY_LIVE_PROVIDER=false` keeps responses deterministic and offline, even if a stale key exists. Live GPT-5.6 requires explicit opt-in plus authorized quota, and the UI shows the live-provider label only after a validated response. Never call deterministic output GPT-5.6.

Submission wording: MedRelay is a zero-cost safety-focused demo with validated deterministic fallback behavior. GPT-5.6 integration is implemented but live inference is disabled because no API quota is available.

See `DEPLOYMENT.md`, `SAFETY.md`, and `VERIFICATION_REPORT.md`.
