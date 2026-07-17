# Project description

Patients often switch languages, correct themselves, and omit context while describing a concern. MedRelay helps preserve those words for a clinician instead of turning them into an unsupported medical conclusion.

The flagship `/medrelay` experience captures multilingual statements, asks focused questions when GPT is configured, highlights precautionary warning signs, tracks missing information, and generates an editable handoff. Each extracted fact carries a direct, translated, or inferred evidence reference; translated and inferred items require confirmation.

Built with React, TypeScript, tRPC, Express, Zod, the OpenAI Responses API, and an ephemeral demo-session store. Verified and unverified capabilities are listed in `VERIFICATION_REPORT.md`.
