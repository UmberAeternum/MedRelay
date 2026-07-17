import { Link } from "wouter";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-[#07111f] px-5 text-center text-slate-100">
    <div><p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">404</p><h1 className="mt-3 text-4xl font-semibold">Page not found</h1><p className="mt-3 text-slate-400">Return to the MedRelay synthetic-data demo.</p><Link href="/" className="mt-6 inline-block rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950">Go home</Link></div>
  </main>;
}
