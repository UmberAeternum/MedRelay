# Hackathon submission

MedRelay turns multilingual patient statements into an editable, evidence-linked clinician-review handoff. Its technical distinction is the safety architecture around the model: deterministic patient-only screening before generation, server-controlled history, strict structured output, semantic validation, deterministic urgency precedence, and resolvable evidence references.

The public demo works without OAuth or MySQL and labels synthetic/offline results honestly. GPT-5.6 is accessed server-side through the OpenAI Responses API when configured. MedRelay does not diagnose, prescribe, book care, claim review, or dispatch services.
