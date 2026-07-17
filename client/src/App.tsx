import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
const Home = lazy(() => import("@/pages/Home"));
const MedRelay = lazy(() => import("@/pages/MedRelay"));
const NotFound = lazy(() => import("@/pages/NotFound"));
export default function App() {
  return <Suspense fallback={<main className="min-h-screen grid place-items-center">Loading MedRelay…</main>}><Switch>
    <Route path="/" component={Home} /><Route path="/medrelay" component={MedRelay} /><Route component={NotFound} />
  </Switch></Suspense>;
}
