import { trpc } from "@/lib/trpc";
import type { ClinicianHandoff } from "../../../server/medrelay/schemas";
import { Check, Clipboard, Mic, RotateCcw, Send, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

type Session = { conversationId: string; accessToken: string };
type Draft = ClinicianHandoff;
const samples = [
  { label: "English headache", text: "I have had a headache since this morning. I am not confused and I have not been vomiting." },
  { label: "Telugu mixed", text: "నాకు నిన్నటి నుంచి తలనొప్పి ఉంది, but no vomiting." },
  { label: "Hindi mixed", text: "मुझे सुबह से सिरदर्द है, no chest pain." },
  { label: "Warning-sign demo", text: "I have a sudden worst headache." },
];

export default function MedRelay() {
  const status = trpc.medrelay.status.useQuery();
  const start = trpc.medrelay.start.useMutation();
  const send = trpc.medrelay.continue.useMutation();
  const handoff = trpc.medrelay.handoff.useMutation();
  const resetMutation = trpc.medrelay.reset.useMutation();
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ id: string; role: "patient"|"assistant"; content: string }[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [state, setState] = useState({ storyCaptured:false, safetyChecked:false, evidenceVerified:false, handoffReady:false });
  const [mode, setMode] = useState<"live"|"offline"|"deterministic"|null>(null);
  const [notice, setNotice] = useState("");
  const busy = start.isPending || send.isPending || handoff.isPending || resetMutation.isPending;

  async function ensureSession() { if (session) return session; const created = await start.mutateAsync(); const next = { conversationId: created.conversationId, accessToken: created.accessToken }; setSession(next); return next; }
  async function submit(text = input) {
    const clean = text.trim(); if (!clean) return;
    setNotice("");
    try { const active = await ensureSession(); const result = await send.mutateAsync({ ...active, message: clean });
      setMessages(old => [...old, result.patientMessage, result.assistantMessage]); setState(result.state); setMode(result.providerMode); setInput(""); setDraft(null);
    } catch { setNotice("The statement could not be processed safely. Please retry or reset the demo."); }
  }
  async function makeHandoff() { try { const active = await ensureSession(); const result = await handoff.mutateAsync(active); setDraft(result.draft); setState(result.state); setMode(result.providerMode); } catch { setNotice("Add a patient statement before creating the handoff."); } }
  async function reset() { if (session) await resetMutation.mutateAsync(session).catch(() => undefined); setSession(null); setMessages([]); setDraft(null); setInput(""); setMode(null); setNotice(""); setState({storyCaptured:false,safetyChecked:false,evidenceVerified:false,handoffReady:false}); }
  function startVoice() {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) { setNotice("Voice input is unavailable in this browser. Typed input remains available."); return; }
    const recognition = new Speech(); recognition.lang = "en-IN"; recognition.onresult = event => setInput(event.results[0]?.[0]?.transcript ?? ""); recognition.onerror = () => setNotice("Microphone permission was unavailable. You can continue by typing."); recognition.start();
  }
  async function copyDraft() { if (!draft) return; try { await navigator.clipboard.writeText(reportText(draft)); setNotice("Handoff copied with evidence references."); } catch { setNotice("Copy failed. Select the report text manually."); } }

  return <main className="min-h-screen bg-[#07111f] text-slate-100">
    <header className="border-b border-white/10"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4"><Link href="/" className="font-bold">Med<span className="text-cyan-300">Relay</span></Link><div className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">Demo — synthetic data only</div></div></header>
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs"><span className={`rounded-full px-3 py-1 ${mode === "live" ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-slate-300"}`}>{mode === "live" ? "GPT-5.6 connected — live response received" : status.data?.configured ? "GPT configured — no live response yet" : "GPT unavailable — deterministic offline sample"}</span><span className="text-slate-500">Ephemeral session · no permanent demo storage</span></div>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries({"Story captured":state.storyCaptured,"Safety checked":state.safetyChecked,"Evidence verified":state.evidenceVerified,"Handoff ready":state.handoffReady}).map(([label,ok]) => <div key={label} className="flex items-center gap-2 rounded-lg border border-white/10 p-2 text-xs">{ok?<Check size={15} className="text-emerald-300"/>:<span className="h-3.5 w-3.5 rounded-full border border-slate-600"/>}{label}</div>)}</div>
      <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[.04] p-4 sm:p-5"><h1 className="text-2xl font-semibold">Capture the patient story</h1><p className="mt-2 text-sm text-slate-400">Choose a synthetic scenario or enter synthetic text. Do not enter real patient data in this demo.</p>
          <div className="mt-4 flex flex-wrap gap-2">{samples.map(sample => <button key={sample.label} disabled={busy} onClick={() => submit(sample.text)} className="rounded-full border border-cyan-300/25 px-3 py-1.5 text-xs text-cyan-100">{sample.label}</button>)}</div>
          <div aria-live="polite" className="mt-5 max-h-80 space-y-3 overflow-auto">{messages.length === 0 && <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-500">No conversation yet. Samples are labelled and only become messages after you select one.</div>}{messages.map(message => <article key={message.id} className={`rounded-xl p-3 text-sm ${message.role === "patient" ? "ml-6 bg-cyan-300 text-slate-950" : "mr-6 bg-slate-800"}`}><span className="mb-1 block text-[10px] font-bold uppercase opacity-70">{message.role}</span>{message.content}</article>)}</div>
          <label htmlFor="patient-message" className="mt-5 block text-sm font-medium">New patient statement</label><textarea id="patient-message" value={input} onChange={e=>setInput(e.target.value)} maxLength={2000} rows={4} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/70 p-3 outline-none focus:border-cyan-300" placeholder="Type synthetic Telugu, Hindi, English, or mixed-language text…"/>
          <div className="mt-3 flex gap-2"><button onClick={startVoice} className="rounded-xl border border-white/15 p-3" aria-label="Use browser speech recognition"><Mic size={18}/></button><button onClick={()=>submit()} disabled={busy || !input.trim()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"><Send size={17}/>{busy?"Working…":"Send safely"}</button></div>
          {notice && <p role="status" className="mt-3 rounded-lg bg-amber-300/10 p-3 text-sm text-amber-100">{notice}</p>}
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/[.04] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-semibold">Clinician-review handoff</h2><p className="text-sm text-slate-400">Editable, evidence-linked, never automatically sent.</p></div><div className="flex gap-2"><button onClick={reset} disabled={busy} className="rounded-lg border border-white/15 p-2" aria-label="Reset demo"><RotateCcw size={17}/></button><button onClick={copyDraft} disabled={!draft} className="rounded-lg border border-white/15 p-2" aria-label="Copy handoff"><Clipboard size={17}/></button></div></div>
          {!draft ? <div className="mt-8 rounded-xl border border-dashed border-white/15 p-8 text-center"><ShieldAlert className="mx-auto text-cyan-300"/><p className="mt-3 text-sm text-slate-400">Validated handoff fields will appear here.</p><button onClick={makeHandoff} disabled={busy || !state.storyCaptured} className="mt-4 rounded-xl bg-white px-4 py-2 font-semibold text-slate-950 disabled:opacity-40">Create handoff</button></div> : <DraftEditor draft={draft} setDraft={setDraft}/>} 
        </section>
      </div>
      <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-slate-500">This draft is not a diagnosis, prescription, or treatment plan. It requires clinician review and does not book care or contact emergency services.</p>
    </div>
  </main>;
}

function DraftEditor({draft,setDraft}:{draft:Draft;setDraft:(value:Draft)=>void}) {
  const fields: Array<[keyof Pick<Draft,"summary"|"timeline"|"careRationale">,string]> = [["summary","Summary"],["timeline","Timeline"],["careRationale","Care rationale"]];
  return <div className="mt-5 space-y-4">{fields.map(([key,label])=><label key={key} className="block text-sm font-medium">{label}<textarea value={draft[key] ?? ""} onChange={e=>setDraft({...draft,[key]:e.target.value || (key === "timeline" ? null : "")})} rows={key==="summary"?4:2} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/70 p-3 font-normal"/></label>)}
    {[["reportedSymptoms","Reported symptoms"],["relevantHistory","Relevant history"],["reportedMedications","Reported medications"],["reportedAllergies","Reported allergies"],["informationGaps","Missing information"],["warningSigns","Warning signs"],["patientNextSteps","Next steps"],["questionsForClinician","Questions for clinician"]].map(([key,label])=><div key={key}><h3 className="text-sm font-semibold">{label}</h3><ul className="mt-1 list-disc pl-5 text-sm text-slate-300">{(draft[key as keyof Draft] as string[]).map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ul></div>)}
    {draft.emergencyGuidance && <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm">{draft.emergencyGuidance}</div>}
    <details className="rounded-lg border border-white/10 p-3"><summary className="cursor-pointer font-semibold">Evidence and audit trail ({draft.evidence.length})</summary><div className="mt-3 space-y-2">{draft.evidence.map((item,index)=><div key={`${item.sourceMessageId}-${index}`} className="rounded bg-slate-950/70 p-2 text-xs"><b>{item.targetField}</b> · {item.kind}{item.requiresConfirmation?" · confirmation needed":""}<blockquote className="mt-1 text-slate-300">“{item.quote}”</blockquote><code className="text-slate-500">{item.sourceMessageId}</code></div>)}</div></details>
  </div>;
}

function reportText(draft: Draft) { return [draft.title,`Summary: ${draft.summary}`,`Timeline: ${draft.timeline ?? "Missing"}`,`Symptoms: ${draft.reportedSymptoms.join("; ")}`,`History: ${draft.relevantHistory.join("; ") || "Missing"}`,`Medications: ${draft.reportedMedications.join("; ") || "Missing"}`,`Allergies: ${draft.reportedAllergies.join("; ") || "Missing"}`,`Information gaps: ${draft.informationGaps.join("; ")}`,`Warning signs: ${draft.warningSigns.join("; ") || "None identified by deterministic rules"}`,`Care level: ${draft.careLevel}`,`Guidance: ${draft.emergencyGuidance ?? "None"}`,`Next steps: ${draft.patientNextSteps.join("; ")}`,`Questions: ${draft.questionsForClinician.join("; ")}`,draft.limitations,"Evidence:",...draft.evidence.map(e=>`${e.targetField} <- ${e.sourceMessageId} [${e.kind}${e.requiresConfirmation?", confirm":""}]: \"${e.quote}\"`)].join("\n"); }

declare global {
  interface Window { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }
  interface SpeechRecognitionConstructor { new(): SpeechRecognitionLike }
  interface SpeechRecognitionLike { lang:string; onresult:(event:SpeechRecognitionEventLike)=>void; onerror:()=>void; start():void }
  interface SpeechRecognitionEventLike { results: ArrayLike<ArrayLike<{ transcript:string }>> }
}
