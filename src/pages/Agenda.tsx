import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronRight, MapPin, Trash2, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useRides } from "@/hooks/useRides";
import { formatBRL } from "@/lib/geo";
import { cn } from "@/lib/utils";
import type { Ride } from "@/types/ride";

const TABS = [
  { id: "upcoming", label: "Próximas" },
  { id: "completed", label: "Concluídas" },
] as const;

type Tab = typeof TABS[number]["id"];

function groupByDay(rides: Ride[]) {
  const map = new Map<string, Ride[]>();
  rides.forEach((r) => {
    const d = new Date(r.scheduledAt);
    const key = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  });
  return Array.from(map.entries());
}

export default function Agenda() {
  const { rides, deleteRide } = useRides();
  const [tab, setTab] = useState<Tab>("upcoming");

  const filtered = useMemo(() => {
    const list = rides.slice().sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
    if (tab === "upcoming") return list.filter((r) => r.status !== "completed");
    return list.filter((r) => r.status === "completed").reverse();
  }, [rides, tab]);

  const grouped = groupByDay(filtered);

  return (
    <AppShell>
      <header className="px-5 pt-10">
        <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gerencie suas corridas particulares</p>
      </header>

      <div className="px-5 pt-5">
        <div className="flex gap-1 rounded-full border border-border bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 rounded-full px-4 py-2 text-xs font-semibold transition-smooth",
                tab === t.id ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 px-5">
        {grouped.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-3 text-sm text-muted-foreground">
              {tab === "upcoming" ? "Sem corridas agendadas." : "Nenhuma corrida concluída ainda."}
            </p>
          </div>
        ) : (
          <ul className="space-y-6">
            {grouped.map(([day, items]) => (
              <li key={day}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{day}</p>
                <ul className="space-y-2.5">
                  {items.map((ride) => (
                    <li key={ride.id}>
                      <RideCard ride={ride} onDelete={() => deleteRide(ride.id)} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function RideCard({ ride, onDelete }: { ride: Ride; onDelete: () => void }) {
  const time = new Date(ride.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-smooth hover:border-primary/40">
      <Link to={`/corrida/${ride.id}`} className="block p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold tabular text-secondary-foreground">{time}</span>
              <p className="truncate text-sm font-semibold">{ride.clientName}</p>
            </div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                <span className="truncate">{ride.pickups.length > 0 ? ride.pickups[0]?.address : ride.origin.address}</span>
                {ride.pickups.length > 1 && (
                  <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-bold text-warning">
                    <Users className="h-2.5 w-2.5" /> +{ride.pickups.length - 1}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-info" />
                <span className="truncate">{ride.destination.address}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-bold tabular text-primary">{formatBRL(ride.price)}</p>
            <p className="text-[10px] text-muted-foreground tabular">{ride.totalKm.toFixed(1)} km</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            <MapPin className="h-3.5 w-3.5" /> Abrir rota
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
          <StatusPill status={ride.status} />
        </div>
      </Link>

      <button
        onClick={(e) => { e.preventDefault(); if (confirm("Excluir esta corrida?")) onDelete(); }}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-smooth group-hover:opacity-100 hover:bg-destructive/15 hover:text-destructive"
        aria-label="Excluir"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </article>
  );
}

function StatusPill({ status }: { status: Ride["status"] }) {
  const map: Record<Ride["status"], { label: string; className: string }> = {
    scheduled: { label: "Agendada", className: "bg-secondary text-secondary-foreground" },
    pickup: { label: "Indo buscar", className: "bg-warning/20 text-warning" },
    ongoing: { label: "Em viagem", className: "bg-primary/20 text-primary" },
    completed: { label: "Concluída", className: "bg-success/15 text-success" },
  };
  const { label, className } = map[status];
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", className)}>{label}</span>
  );
}
