import { ArrowRight, FileCheck2, Languages, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return <main className="min-h-screen bg-[#07111f] text-slate-100">
    <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6"><span className="text-xl font-bold tracking-tight">Med<span className="text-cyan-300">Relay</span></span><Link href="/medrelay" className="rounded-full border border-cyan-300/40 px-4 py-2 text-sm">Open demo</Link></nav>
    <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-20 pt-16 lg:grid-cols-[1.2fr_.8fr] lg:pt-28">
      <div><div className="mb-5 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">Handoff support — not diagnosis</div>
        <h1 className="max-w-3xl text-5xl font-semibold leading-[1.06] tracking-tight sm:text-7xl">Patient words in. <span className="text-cyan-300">Evidence-linked</span> handoff out.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">MedRelay captures Telugu, Hindi, English, and mixed-language symptom stories, highlights precautionary warning signs, and creates an editable draft for clinician review.</p>
        <Link href="/medrelay" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950">Try the synthetic demo <ArrowRight size={18}/></Link>
      </div>
      <div className="grid gap-4 self-end">
        {[ [Languages,"Multilingual intake","Preserves the patient’s original statements."], [ShieldCheck,"Safety before AI","Deterministic screening runs before any model request."], [FileCheck2,"Traceable draft","Every extracted fact links back to patient evidence."] ].map(([Icon,title,text]) => { const C = Icon as typeof Languages; return <article key={String(title)} className="rounded-2xl border border-white/10 bg-white/5 p-5"><C className="mb-3 text-cyan-300"/><h2 className="font-semibold">{String(title)}</h2><p className="mt-1 text-sm text-slate-400">{String(text)}</p></article>; })}
      </div>
    </section>
  </main>;
}
