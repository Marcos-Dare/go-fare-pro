import { ArrowLeft, Calculator, Info, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRatePerKm, useRides } from "@/hooks/useRides";
import { formatBRL } from "@/lib/geo";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { resetUser } from "@/lib/observability";

export default function Settings() {
  const nav = useNavigate();
  const [rate, setRate] = useRatePerKm();
  const { rides, deleteRide } = useRides();
  const { user, signOut } = useAuth();

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-xl safe-top">
        <button
          onClick={() => nav(-1)}
          className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-smooth active:scale-95 hover:bg-secondary"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">Ajustes</h1>
      </header>

      <div className="space-y-5 px-4 pt-5">
        <section className="rounded-2xl border border-border bg-card p-4">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Calculator className="h-4 w-4 text-primary" /> Valor padrão por km
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">Usado em todos os novos orçamentos.</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">R$</span>
            <Input
              inputMode="decimal"
              className="text-right tabular text-lg font-semibold"
              value={String(rate)}
              onChange={(e) => setRate(Number(e.target.value.replace(",", ".")) || 0)}
            />
            <span className="text-xs text-muted-foreground">/ km</span>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Resumo</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat label="Corridas" value={rides.length.toString()} />
            <Stat
              label="Faturado"
              value={formatBRL(rides.filter((r) => r.status === "completed").reduce((s, r) => s + r.price, 0))}
            />
          </div>
        </section>

        <button
          onClick={() => {
            if (confirm("Apagar TODAS as corridas? Esta ação é irreversível.")) {
              Promise.all(rides.map((r) => deleteRide(r.id))).then(() =>
                toast.success("Histórico apagado.")
              );
            }
          }}
          className="w-full rounded-2xl border border-destructive/30 bg-destructive/10 py-3 text-sm font-semibold text-destructive transition-smooth active:scale-[0.98]"
        >
          Limpar histórico
        </button>

        <button
          onClick={async () => {
            await signOut();
            resetUser();
            nav("/auth", { replace: true });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition-smooth active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>

        <p className="flex items-center justify-center gap-1.5 pt-2 text-center text-[11px] text-muted-foreground">
          <Info className="h-3 w-3" /> {user?.email ? `Conectado como ${user.email}` : "Dados sincronizados na nuvem"}
        </p>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular">{value}</p>
    </div>
  );
}
