import { trpc } from "@/lib/trpc";
import type {
  CareLevel,
  ClinicianHandoff,
  ConversationReply,
} from "../../../server/medrelay/schemas";
import type {
  AssistantMessage,
  PatientMessage,
} from "../../../server/medrelay/sessionStore";
import { Check, Clipboard, Mic, RotateCcw, Send, ShieldAlert } from "lucide-react";
import {
  type KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "wouter";

type Session = { conversationId: string; accessToken: string };
type Draft = ClinicianHandoff;
type Turn = {
  patient: PatientMessage;
  assistant: AssistantMessage;
  reply: ConversationReply;
};

type Scenario = { label: string; category: string; text: string };

const scenarios: Scenario[] = [
  { label: "Fever and cough", category: "Respiratory", text: "Synthetic example: I have had a fever and dry cough since yesterday." },
  { label: "Stomach discomfort", category: "Digestive", text: "Synthetic example: My stomach feels uncomfortable after meals and I feel nauseated." },
  { label: "Urinary symptoms", category: "Urinary", text: "Synthetic example: I have been urinating more often and it burns a little." },
  { label: "Rash", category: "Skin", text: "Synthetic example: I noticed an itchy rash on my arms this morning." },
  { label: "Dizziness", category: "Balance", text: "Synthetic example: I feel dizzy when I stand up, but I have not fainted." },
  { label: "Injury and pain", category: "Injury", text: "Synthetic example: I twisted my ankle earlier and it hurts when I walk." },
  { label: "Telugu input", category: "Language", text: "Synthetic example: నాకు నిన్నటి నుంచి జ్వరం మరియు దగ్గు ఉంది." },
  { label: "Hindi input", category: "Language", text: "Synthetic example: मुझे कल से पेट में परेशानी और मितली है।" },
  { label: "Mixed-language", category: "Language", text: "Synthetic example: Morning nunchi headache undi, and I feel dizzy when I stand." },
  { label: "Correction example", category: "Conversation", text: "Synthetic example: Correction: the pain started Tuesday, not Monday." },
  { label: "Warning-sign example", category: "Safety", text: "Synthetic example: I suddenly have severe trouble breathing." },
];

const careLabels: Record<CareLevel, string> = {
  emergency_services: "Emergency guidance",
  urgent_clinician_review: "Prompt clinician review",
  routine_clinician_review: "Routine clinician review",
  collect_more_information: "Collect more information",
};

const textFields: Array<[keyof Pick<Draft, "summary" | "timeline" | "careRationale">, string]> = [
  ["summary", "Summary"],
  ["timeline", "Timeline"],
  ["careRationale", "Care rationale"],
];

const listFields: Array<[keyof Draft, string]> = [
  ["reportedSymptoms", "Reported symptoms"],
  ["relevantHistory", "Relevant history"],
  ["reportedMedications", "Reported medications"],
  ["reportedAllergies", "Reported allergies"],
  ["informationGaps", "Missing information"],
  ["warningSigns", "Warning signs"],
  ["patientNextSteps", "Next steps"],
  ["questionsForClinician", "Questions for clinician"],
];

function providerLabel(mode: "live" | "offline" | "deterministic" | null, configured: boolean | undefined) {
  if (mode === "live") return "Provider: live structured response";
  if (mode === "deterministic") return "Provider: deterministic safety response";
  if (mode === "offline") return "Provider: offline deterministic intake";
  return configured ? "Provider configured; waiting for a response" : "Provider unavailable; deterministic intake ready";
}

export default function MedRelay() {
  const status = trpc.medrelay.status.useQuery();
  const start = trpc.medrelay.start.useMutation();
  const send = trpc.medrelay.continue.useMutation();
  const handoff = trpc.medrelay.handoff.useMutation();
  const resetMutation = trpc.medrelay.reset.useMutation();
  const [session, setSession] = useState<Session | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [state, setState] = useState({ storyCaptured: false, safetyChecked: false, evidenceVerified: false, handoffReady: false });
  const [mode, setMode] = useState<"live" | "offline" | "deterministic" | null>(null);
  const [notice, setNotice] = useState("");
  const [composerResetKey, setComposerResetKey] = useState(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const busy = start.isPending || send.isPending || handoff.isPending || resetMutation.isPending;

  const ensureSession = useCallback(async () => {
    if (session) return session;
    const created = await start.mutateAsync();
    const next = { conversationId: created.conversationId, accessToken: created.accessToken };
    setSession(next);
    return next;
  }, [session, start]);

  const submit = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setNotice("");
    try {
      const active = await ensureSession();
      const result = await send.mutateAsync({ ...active, message: clean });
      setTurns(old => [...old, { patient: result.patientMessage, assistant: result.assistantMessage, reply: result.reply }]);
      setState(result.state);
      setMode(result.providerMode);
      setDraft(null);
      setComposerResetKey(key => key + 1);
    } catch {
      setNotice("The statement could not be processed safely. Your typed text is still available; retry or reset the demo.");
    }
  }, [ensureSession, send]);

  const makeHandoff = useCallback(async () => {
    try {
      const active = await ensureSession();
      const result = await handoff.mutateAsync(active);
      setDraft(result.draft);
      setState(result.state);
      setMode(result.providerMode);
    } catch {
      setNotice("Add a patient statement before creating the handoff.");
    }
  }, [ensureSession, handoff]);

  const reset = useCallback(async () => {
    if (session) await resetMutation.mutateAsync(session).catch(() => undefined);
    setSession(null);
    setTurns([]);
    setDraft(null);
    setMode(null);
    setNotice("");
    setComposerResetKey(key => key + 1);
    setState({ storyCaptured: false, safetyChecked: false, evidenceVerified: false, handoffReady: false });
  }, [resetMutation, session]);

  const onNotice = useCallback((message: string) => setNotice(message), []);
  const saveDraft = useCallback((value: Draft) => setDraft(value), []);
  const highlightEvidence = useCallback((messageId: string) => setHighlightedMessageId(messageId), []);
  useEffect(() => {
    if (!highlightedMessageId) return;
    document.getElementById(`patient-${highlightedMessageId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [highlightedMessageId]);
  const statusText = useMemo(() => providerLabel(mode, status.data?.configured), [mode, status.data?.configured]);

  return (
    <main className="min-h-screen bg-[var(--med-bg)] text-slate-100">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <Link href="/" className="font-bold">Med<span className="text-cyan-300">Relay</span></Link>
          <div className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">Demo - synthetic data only</div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div aria-live="polite" role="status" className="mb-5 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-cyan-300/15 px-3 py-1 text-cyan-100">{statusText}</span>
          <span className="text-slate-500">Ephemeral session - no permanent demo storage</span>
        </div>
        <p className="mb-5 max-w-3xl text-sm text-slate-400">MedRelay captures multilingual, patient-authored symptoms and prepares an evidence-linked clinician-review draft. It does not diagnose, prescribe, book care, or contact emergency services.</p>
        <ProgressStrip state={state} />
        <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
          <section className="rounded-2xl border border-white/10 bg-white/[.04] p-4 sm:p-5">
            <h1 className="text-2xl font-semibold">Capture the patient story</h1>
            <p className="mt-2 text-sm text-slate-400">Select a clearly labelled synthetic scenario or type any English, Hindi, Telugu, or mixed-language statement.</p>
            <ScenarioPicker scenarios={scenarios} disabled={busy} onSelect={submit} />
            <Transcript turns={turns} highlightedMessageId={highlightedMessageId} onEvidenceSelect={highlightEvidence} />
            <PatientComposer busy={busy} onSubmit={submit} onNotice={onNotice} resetKey={composerResetKey} />
            {notice && <p role="status" className="mt-3 rounded-lg bg-amber-300/10 p-3 text-sm text-amber-100">{notice}</p>}
          </section>
          <HandoffPanel draft={draft} state={state} busy={busy} onCreate={makeHandoff} onReset={reset} onSave={saveDraft} onNotice={onNotice} onEvidenceSelect={highlightEvidence} />
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-slate-500">Every output is an editable clinician-review draft, not a diagnosis, prescription, or treatment plan. It does not claim clinician review has already happened.</p>
      </div>
    </main>
  );
}

const ProgressStrip = memo(function ProgressStrip({ state }: { state: { storyCaptured: boolean; safetyChecked: boolean; evidenceVerified: boolean; handoffReady: boolean } }) {
  const items = [["Story captured", state.storyCaptured], ["Safety checked", state.safetyChecked], ["Evidence verified", state.evidenceVerified], ["Handoff ready", state.handoffReady]] as const;
  return <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">{items.map(([label, ok]) => <div key={label} className="flex items-center gap-2 rounded-lg border border-white/10 p-2 text-xs">{ok ? <Check size={15} className="text-emerald-300" /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-600" />}{label}</div>)}</div>;
});

const ScenarioPicker = memo(function ScenarioPicker({ scenarios: items, disabled, onSelect }: { scenarios: Scenario[]; disabled: boolean; onSelect: (text: string) => void }) {
  return <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{items.map(scenario => <button key={scenario.label} type="button" disabled={disabled} onClick={() => void onSelect(scenario.text)} className="min-h-14 rounded-xl border border-cyan-300/25 px-3 py-2 text-left text-xs text-cyan-100 transition hover:bg-cyan-300/10 disabled:opacity-50"><span className="block font-semibold">{scenario.label}</span><span className="mt-1 block text-[10px] text-slate-500">Synthetic - {scenario.category}</span></button>)}</div>;
});

const Transcript = memo(function Transcript({ turns, highlightedMessageId, onEvidenceSelect }: { turns: Turn[]; highlightedMessageId: string | null; onEvidenceSelect: (messageId: string) => void }) {
  return <div aria-live="polite" className="mt-5 max-h-[32rem] space-y-4 overflow-auto">{turns.length === 0 && <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-500">No conversation yet. Samples are labelled synthetic data and arbitrary typed input is supported.</div>}{turns.map(turn => <TurnView key={turn.patient.id} turn={turn} highlightedMessageId={highlightedMessageId} onEvidenceSelect={onEvidenceSelect} />)}</div>;
});

const TurnView = memo(function TurnView({ turn, highlightedMessageId, onEvidenceSelect }: { turn: Turn; highlightedMessageId: string | null; onEvidenceSelect: (messageId: string) => void }) {
  const { reply } = turn;
  const followUpAlreadyShown = Boolean(reply.followUpQuestion && reply.message.toLocaleLowerCase().includes(reply.followUpQuestion.toLocaleLowerCase()));
  return <article className="space-y-2"><div id={`patient-${turn.patient.id}`} className={`ml-6 rounded-xl p-3 text-sm text-slate-950 transition-colors ${highlightedMessageId === turn.patient.id ? "bg-[var(--med-amber)] ring-2 ring-[var(--med-amber)]/70" : "bg-cyan-300"}`}><span className="mb-1 block text-[10px] font-bold uppercase opacity-70">Patient statement</span>{turn.patient.content}</div><div className="mr-6 rounded-xl bg-[var(--med-soft)] p-3 text-sm"><span className="mb-1 block text-[10px] font-bold uppercase opacity-70">Assistant - validated draft support</span>{turn.assistant.content}{reply.followUpQuestion && !followUpAlreadyShown && <div data-testid="follow-up-question" className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-2"><b>Focused follow-up:</b> {reply.followUpQuestion}</div>}{reply.informationGaps.length > 0 && <DetailList title="Missing information" items={reply.informationGaps} />}{reply.warningSigns.length > 0 && <DetailList title="Deterministic warning signs" items={reply.warningSigns} tone="warning" />}<div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2"><div><b>Care level:</b> {careLabels[reply.careLevel]}</div><div><b>Rationale:</b> {reply.careRationale}</div></div>{reply.emergencyGuidance && <div role="alert" className="mt-3 rounded-lg border border-red-300/30 bg-red-300/10 p-3 text-red-100">{reply.emergencyGuidance}</div>}<EvidenceList evidence={reply.evidence} onSelect={onEvidenceSelect} /></div></article>;
});

function DetailList({ title, items, tone = "normal" }: { title: string; items: string[]; tone?: "normal" | "warning" }) {
  return <div className={`mt-3 rounded-lg p-2 text-xs ${tone === "warning" ? "bg-red-300/10 text-red-100" : "bg-white/5 text-slate-300"}`}><b>{title}</b><ul className="mt-1 list-disc pl-5">{items.map(item => <li key={item}>{item}</li>)}</ul></div>;
}

const EvidenceList = memo(function EvidenceList({ evidence, onSelect }: { evidence: ConversationReply["evidence"]; onSelect?: (messageId: string) => void }) {
  return <details className="mt-3 rounded-lg border border-white/10 p-2 text-xs"><summary className="cursor-pointer font-semibold">Evidence references ({evidence.length})</summary><div className="mt-2 space-y-2">{evidence.map((item, index) => <button type="button" key={`${item.sourceMessageId}-${item.targetField}-${index}`} onClick={() => onSelect?.(item.sourceMessageId)} className="block w-full rounded bg-slate-950/70 p-2 text-left transition hover:bg-slate-900"><b>{item.targetField}</b> - {item.kind}{item.requiresConfirmation ? " - confirmation needed" : ""}<blockquote className="mt-1 text-slate-300">“{item.quote}”</blockquote><code className="text-slate-500">{item.sourceMessageId}</code></button>)}</div></details>;
});

const PatientComposer = memo(function PatientComposer({ busy, onSubmit, onNotice, resetKey }: { busy: boolean; onSubmit: (text: string) => Promise<void>; onNotice: (message: string) => void; resetKey: number }) {
  const [value, setValue] = useState("");
  useEffect(() => setValue(""), [resetKey]);
  const submit = useCallback(() => void onSubmit(value), [onSubmit, value]);
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  }, [submit]);
  const startVoice = useCallback(() => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) { onNotice("Voice input is unavailable in this browser. Typed input remains available."); return; }
    const recognition = new Speech();
    recognition.lang = "en-IN";
    recognition.onresult = event => setValue(event.results[0]?.[0]?.transcript ?? "");
    recognition.onerror = () => onNotice("Microphone permission was unavailable. Your typed input remains available.");
    try { recognition.start(); } catch { onNotice("Microphone permission was unavailable. Your typed input remains available."); }
  }, [onNotice]);
  return <div className="mt-5"><label htmlFor="patient-message" className="block text-sm font-medium">New patient statement</label><textarea id="patient-message" value={value} onChange={event => setValue(event.target.value)} onKeyDown={onKeyDown} maxLength={2_000} rows={4} className="mt-2 w-full resize-y rounded-xl border border-white/15 bg-slate-950/70 p-3 outline-none focus:border-cyan-300" placeholder="Type synthetic Telugu, Hindi, English, or mixed-language text..." aria-describedby="patient-message-help" /><p id="patient-message-help" className="mt-1 text-xs text-slate-500">Patient-authored text is treated as untrusted data. Press Ctrl/Cmd+Enter or use Send safely.</p><div className="mt-3 flex gap-2"><button type="button" onClick={startVoice} className="min-h-12 min-w-12 rounded-xl border border-white/15 p-3" aria-label="Use browser speech recognition"><Mic size={18} /></button><button type="button" onClick={submit} disabled={busy || !value.trim()} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"><Send size={17} />{busy ? "Working..." : "Send safely"}</button></div></div>;
});

const HandoffPanel = memo(function HandoffPanel({ draft, state, busy, onCreate, onReset, onSave, onNotice, onEvidenceSelect }: { draft: Draft | null; state: { storyCaptured: boolean; safetyChecked: boolean; evidenceVerified: boolean; handoffReady: boolean }; busy: boolean; onCreate: () => Promise<void>; onReset: () => Promise<void>; onSave: (draft: Draft) => void; onNotice: (message: string) => void; onEvidenceSelect: (messageId: string) => void }) {
  return <section className="rounded-2xl border border-white/10 bg-[var(--med-surface)] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-semibold">Clinician-review handoff</h2><p className="text-sm text-slate-400">Editable, evidence-linked, never automatically sent.</p></div><button type="button" onClick={() => void onReset()} disabled={busy} className="rounded-lg border border-white/15 p-2" aria-label="Reset demo"><RotateCcw size={17} /></button></div>{!draft ? <div className="mt-8 rounded-xl border border-dashed border-white/15 p-8 text-center"><ShieldAlert className="mx-auto text-cyan-300" /><p className="mt-3 text-sm text-slate-400">Validated handoff fields will appear here.</p><button type="button" onClick={() => void onCreate()} disabled={busy || !state.storyCaptured} className="mt-4 rounded-xl bg-white px-4 py-2 font-semibold text-slate-950 disabled:opacity-40">Create handoff</button></div> : <DraftEditor draft={draft} onSave={onSave} onNotice={onNotice} onEvidenceSelect={onEvidenceSelect} />}</section>;
});

const DraftEditor = memo(function DraftEditor({ draft, onSave, onNotice, onEvidenceSelect }: { draft: Draft; onSave: (draft: Draft) => void; onNotice: (message: string) => void; onEvidenceSelect: (messageId: string) => void }) {
  const [localDraft, setLocalDraft] = useState(draft);
  useEffect(() => setLocalDraft(draft), [draft]);
  const updateText = useCallback((key: keyof Pick<Draft, "summary" | "timeline" | "careRationale">, value: string) => setLocalDraft(current => ({ ...current, [key]: value || (key === "timeline" ? null : "") })), []);
  const copy = useCallback(async () => { try { await navigator.clipboard.writeText(reportText(localDraft)); onNotice("Handoff copied with evidence references."); } catch { onNotice("Copy failed. Select the report text manually."); } }, [localDraft, onNotice]);
  return <div className="mt-5 space-y-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => onSave(localDraft)} className="rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950">Save edits</button><button type="button" onClick={() => void copy()} className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm" aria-label="Copy handoff"><Clipboard size={16} />Copy</button></div>{textFields.map(([key, label]) => <label key={key} className="block text-sm font-medium">{label}<textarea aria-label={label} value={(localDraft[key] as string | null) ?? ""} onChange={event => updateText(key, event.target.value)} rows={key === "summary" ? 4 : 2} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/70 p-3 font-normal" /></label>)}{listFields.map(([key, label]) => <div key={String(key)}><h3 className="text-sm font-semibold">{label}</h3><ul className="mt-1 list-disc pl-5 text-sm text-slate-300">{(localDraft[key] as string[]).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div>)}{localDraft.emergencyGuidance && <div role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm">{localDraft.emergencyGuidance}</div>}<EvidenceList evidence={localDraft.evidence} onSelect={onEvidenceSelect} /><p className="text-xs text-slate-500">Saved edits remain a clinician-review draft and are not sent automatically.</p></div>;
});

function reportText(draft: Draft) {
  return [draft.title, `Summary: ${draft.summary}`, `Timeline: ${draft.timeline ?? "Missing"}`, `Symptoms: ${draft.reportedSymptoms.join("; ")}`, `History: ${draft.relevantHistory.join("; ") || "Missing"}`, `Medications: ${draft.reportedMedications.join("; ") || "Missing"}`, `Allergies: ${draft.reportedAllergies.join("; ") || "Missing"}`, `Information gaps: ${draft.informationGaps.join("; ")}`, `Warning signs: ${draft.warningSigns.join("; ") || "None identified by deterministic rules"}`, `Care level: ${draft.careLevel}`, `Guidance: ${draft.emergencyGuidance ?? "None"}`, `Next steps: ${draft.patientNextSteps.join("; ")}`, `Questions: ${draft.questionsForClinician.join("; ")}`, draft.limitations, "Evidence:", ...draft.evidence.map(e => `${e.targetField} <- ${e.sourceMessageId} [${e.kind}${e.requiresConfirmation ? ", confirm" : ""}]: \"${e.quote}\"`)].join("\n");
}

declare global {
  interface Window { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }
  interface SpeechRecognitionConstructor { new (): SpeechRecognitionLike }
  interface SpeechRecognitionLike { lang: string; onresult: (event: SpeechRecognitionEventLike) => void; onerror: () => void; start: () => void }
  interface SpeechRecognitionEventLike { results: ArrayLike<ArrayLike<{ transcript: string }>> }
}
