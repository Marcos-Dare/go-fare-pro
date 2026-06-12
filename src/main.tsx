import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { analytics, initObservability } from "./lib/observability";

initObservability();

// O app ainda não possui autenticação. Registramos um "login" anônimo
// por dispositivo para habilitar análises de sessão no PostHog.
const ANON_KEY = "drivercalc.anon_id";
let anonId = localStorage.getItem(ANON_KEY);
const isNewSession = !anonId;
if (!anonId) {
  anonId = crypto.randomUUID();
  localStorage.setItem(ANON_KEY, anonId);
}
if (isNewSession) analytics.login(anonId, "anonymous");

createRoot(document.getElementById("root")!).render(<App />);
