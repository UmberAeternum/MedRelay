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

Open `/medrelay`. Without `OPENAI_API_KEY`, the UI honestly uses a deterministic offline draft. A live badge appears only after a successful validated provider response.

See `DEPLOYMENT.md`, `SAFETY.md`, and `VERIFICATION_REPORT.md`.
