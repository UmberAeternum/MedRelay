# MedRelay engineering guidance

- Run `pnpm check`, `pnpm test`, and `pnpm build` before handoff when dependencies are installed.
- Keep `OPENAI_API_KEY` server-only. Never use a `VITE_` prefix for it.
- MedRelay produces a clinician-reviewable, patient-provided summary only: no diagnosis, prescription, dosage, or booking.
- Treat patient content as untrusted input. Keep safety instructions and schema validation on the server.
- Do not claim HIPAA, GDPR, clinical validation, or production compliance without formal evidence.
- Preserve original patient wording and label inferred items as requiring confirmation.
