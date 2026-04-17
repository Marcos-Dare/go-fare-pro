import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ExternalLink, Flag, MapPin, Navigation, Phone, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RouteMap } from "@/components/RouteMap";
import { useRides } from "@/hooks/useRides";
import { formatBRL, formatKm } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ActiveRide() {
  const nav = useNavigate();
  const { id = "" } = useParams();
  const { rides, setStatus } = useRides();
  const ride = useMemo(() => rides.find((r) => r.id === id), [rides, id]);

  if (!ride) {
    return (
      <AppShell>
        <div className="px-5 pt-20 text-center">
          <p className="text-sm text-muted-foreground">Corrida não encontrada.</p>
          <button onClick={() => nav("/agenda")} className="mt-4 text-sm font-semibold text-primary">Voltar para a agenda</button>
        </div>
      </AppShell>
    );
  }

  const phase: "pickup" | "trip" =
    ride.status === "ongoing" ? "trip" : "pickup";

  const target = phase === "pickup" ? ride.pickup : ride.destination;

  function openExternal() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${target.coords.lat},${target.coords.lng}&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function advance() {
    if (ride!.status === "scheduled" || ride!.status === "pickup") {
      setStatus(ride!.id, "ongoing");
      toast.success("Cliente embarcado. Boa viagem!");
    } else if (ride!.status === "ongoing") {
      setStatus(ride!.id, "completed");
      toast.success(`Corrida finalizada! ${formatBRL(ride!.price)}`);
      nav("/agenda");
    }
  }

  const isCompleted = ride.status === "completed";

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
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold leading-tight">{ride.clientName}</h1>
          <p className="text-xs text-muted-foreground">
            {new Date(ride.scheduledAt).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-bold tabular text-primary">{formatBRL(ride.price)}</p>
          <p className="text-[10px] text-muted-foreground tabular">{formatKm(ride.totalKm)}</p>
        </div>
      </header>

      <div className="overflow-hidden">
        <RouteMap
          className="h-72 w-full"
          highlightLeg={isCompleted ? "all" : phase}
          points={[
            { coords: ride.origin.coords, label: ride.origin.address, kind: "origin" },
            { coords: ride.pickup.coords, label: ride.pickup.address, kind: "pickup" },
            { coords: ride.destination.coords, label: ride.destination.address, kind: "destination" },
          ]}
        />
      </div>

      <div className="px-4 pt-5">
        {!isCompleted && (
          <div
            className={cn(
              "relative overflow-hidden rounded-3xl border p-5 shadow-elevated",
              phase === "pickup"
                ? "border-warning/40 bg-warning/10"
                : "border-primary/40 bg-primary/10"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                phase === "pickup" ? "bg-warning text-background" : "bg-primary text-primary-foreground"
              )}>
                {phase === "pickup" ? <User className="h-5 w-5" strokeWidth={2.4} /> : <Flag className="h-5 w-5" strokeWidth={2.4} />}
                <span className={cn("pulse-ring absolute inset-0 rounded-full")} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {phase === "pickup" ? "Status — Indo buscar" : "Status — Em viagem"}
                </p>
                <p className="mt-0.5 truncate text-sm font-bold">{target.address}</p>
              </div>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="rounded-3xl border border-success/40 bg-success/10 p-5 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" strokeWidth={1.8} />
            <p className="mt-2 text-sm font-semibold">Corrida concluída</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {ride.completedAt && new Date(ride.completedAt).toLocaleString("pt-BR")}
            </p>
          </div>
        )}

        <div className="mt-5 space-y-2.5">
          <RouteRow color="bg-primary" tag="A" label="Saída" address={ride.origin.address} dim />
          <RouteRow
            color="bg-warning" tag="B"
            label={`Coleta · ${formatKm(ride.distancePickupKm)}`}
            address={ride.pickup.address}
            dim={phase === "trip"}
            active={phase === "pickup" && !isCompleted}
          />
          <RouteRow
            color="bg-info" tag="C"
            label={`Destino · ${formatKm(ride.distanceTripKm)}`}
            address={ride.destination.address}
            active={phase === "trip" && !isCompleted}
          />
        </div>

        {ride.notes && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Obs:</span> {ride.notes}
          </div>
        )}
      </div>

      {!isCompleted && (
        <div className="fixed inset-x-0 bottom-20 z-20 mx-auto flex max-w-md gap-2 px-4 safe-bottom">
          <button
            onClick={openExternal}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 text-sm font-semibold shadow-elevated transition-smooth active:scale-[0.98]"
          >
            <Navigation className="h-4 w-4" /> Google Maps
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={advance}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold shadow-glow transition-spring active:scale-[0.98]",
              phase === "pickup" ? "bg-warning text-background" : "bg-primary text-primary-foreground"
            )}
          >
            {phase === "pickup" ? (<><User className="h-4 w-4" /> Cliente embarcou</>) : (<><Flag className="h-4 w-4" /> Finalizar</>)}
          </button>
        </div>
      )}
    </AppShell>
  );
}

function RouteRow({
  color, tag, label, address, active, dim,
}: { color: string; tag: string; label: string; address: string; active?: boolean; dim?: boolean; }) {
  return (
    <div className={cn(
      "flex items-start gap-3 rounded-2xl border p-3 transition-smooth",
      active ? "border-primary/50 bg-primary/5" : "border-border bg-card",
      dim && "opacity-60"
    )}>
      <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-background", color)}>
        {tag}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{address}</p>
      </div>
      {active && <span className="mt-2 h-2 w-2 animate-pulse rounded-full bg-primary" />}
    </div>
  );
}
