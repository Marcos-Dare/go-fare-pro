import { Link } from "react-router-dom";
import { ArrowRight, Calendar, MapPin, Plus, TrendingUp, Users, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useRides } from "@/hooks/useRides";
import { formatBRL } from "@/lib/geo";
import { useMemo } from "react";

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function Dashboard() {
  const { rides } = useRides();

  const todayRides = useMemo(
    () => rides.filter((r) => isToday(r.scheduledAt) && r.status !== "completed"),
    [rides]
  );
  const upcoming = useMemo(
    () =>
      rides
        .filter((r) => r.status !== "completed" && new Date(r.scheduledAt).getTime() >= Date.now() - 60 * 60 * 1000)
        .slice(0, 3),
    [rides]
  );
  const todayEstimated = useMemo(
    () => rides.filter((r) => isToday(r.scheduledAt)).reduce((s, r) => s + r.price, 0),
    [rides]
  );
  const todayCompleted = useMemo(
    () => rides.filter((r) => isToday(r.scheduledAt) && r.status === "completed").reduce((s, r) => s + r.price, 0),
    [rides]
  );

  return (
    <AppShell>
      <header className="px-5 pt-10">
        <p className="text-sm text-muted-foreground">Boa rodagem,</p>
        <h1 className="mt-0.5 text-3xl font-bold tracking-tight">DriverCalc</h1>
      </header>

      <section className="px-5 pt-6">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card p-5 shadow-elevated">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/20 blur-3xl" aria-hidden />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" /> Ganhos estimados hoje
              </div>
              <p className="mt-2 text-4xl font-extrabold tabular text-foreground">{formatBRL(todayEstimated)}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-success">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="tabular">{formatBRL(todayCompleted)} já realizados</span>
              </div>
            </div>
            <div className="rounded-2xl bg-primary/15 px-3 py-2 text-center">
              <p className="text-2xl font-bold text-primary tabular">{todayRides.length}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-primary/80">corridas</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Próximas corridas</h2>
          <Link to="/agenda" className="text-xs font-medium text-primary">Ver todas</Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
            <Calendar className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-muted-foreground">Nenhuma corrida agendada.</p>
            <p className="mt-1 text-xs text-muted-foreground">Toque em <span className="font-semibold text-primary">Nova Corrida</span> para começar.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((ride) => (
              <li key={ride.id}>
                <Link
                  to={`/corrida/${ride.id}`}
                  className="block rounded-2xl border border-border bg-card p-4 shadow-soft transition-smooth active:scale-[0.99] hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{ride.clientName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(ride.scheduledAt).toLocaleString("pt-BR", {
                          weekday: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold tabular text-primary">{formatBRL(ride.price)}</p>
                      <p className="text-[10px] text-muted-foreground tabular">{ride.totalKm.toFixed(1)} km</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-warning" />
                    <span className="truncate">{ride.pickups[0]?.address ?? "—"}</span>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span className="truncate">{ride.destination.address}</span>
                  </div>
                  {ride.pickups.length > 1 && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
                      <Users className="h-3 w-3" /> +{ride.pickups.length - 1} parada{ride.pickups.length - 1 > 1 ? "s" : ""}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        to="/nova"
        className="fixed bottom-24 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-6 py-4 text-sm font-bold text-primary-foreground shadow-glow transition-spring active:scale-95"
        aria-label="Nova corrida"
      >
        <Plus className="h-5 w-5" strokeWidth={2.6} />
        Nova Corrida
      </Link>
    </AppShell>
  );
}
