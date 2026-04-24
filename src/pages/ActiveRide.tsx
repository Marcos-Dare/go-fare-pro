import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ExternalLink, Flag, Navigation, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RouteMap, type RoutePoint } from "@/components/RouteMap";
import { useRides } from "@/hooks/useRides";
import { formatBRL, formatKm } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getDirections } from "@/lib/googleMaps";
import type { LatLng } from "@/types/ride";

export default function ActiveRide() {
  const nav = useNavigate();
  const { id = "" } = useParams();
  const { rides, setStatus, updateRide } = useRides();
  const ride = useMemo(() => rides.find((r) => r.id === id), [rides, id]);

  const [path, setPath] = useState<LatLng[] | undefined>(undefined);

  // Fetch full route polyline once for visualization
  useEffect(() => {
    if (!ride) return;
    let cancelled = false;
    getDirections(
      ride.origin.coords,
      ride.pickups.map((p) => p.coords),
      ride.destination.coords
    )
      .then((res) => { if (!cancelled) setPath(res.path); })
      .catch(() => { /* fallback to straight segments */ });
    return () => { cancelled = true; };
  }, [ride?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const isCompleted = ride.status === "completed";
  const phase: "pickup" | "trip" = ride.status === "ongoing" ? "trip" : "pickup";
  const pickupIdx = Math.min(ride.currentPickupIndex ?? 0, ride.pickups.length - 1);
  const totalPickups = ride.pickups.length;

  const target =
    phase === "trip"
      ? ride.destination
      : ride.pickups[pickupIdx];

  function openExternal() {
    // Build a Google Maps directions URL from current target only — single nav target for safety while driving
    const url = `https://www.google.com/maps/dir/?api=1&destination=${target.coords.lat},${target.coords.lng}&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function advance() {
    if (ride!.status === "scheduled" || ride!.status === "pickup") {
      // Move to next pickup, or transition to trip after the last pickup
      const next = pickupIdx + 1;
      if (next < totalPickups) {
        updateRide(ride!.id, { status: "pickup", currentPickupIndex: next });
        toast.success(`Coleta ${pickupIdx + 1} embarcada. Próxima: ${next + 1} de ${totalPickups}.`);
      } else {
        updateRide(ride!.id, { status: "ongoing", currentPickupIndex: pickupIdx });
        toast.success("Todos embarcados. Boa viagem!");
      }
    } else if (ride!.status === "ongoing") {
      setStatus(ride!.id, "completed");
      toast.success(`Corrida finalizada! ${formatBRL(ride!.price)}`);
      nav("/agenda");
    }
  }

  const advanceLabel =
    phase === "trip"
      ? "Finalizar"
      : pickupIdx + 1 < totalPickups
      ? `Embarcou (próx. B${pickupIdx + 2})`
      : "Cliente embarcou";

  const mapPoints: RoutePoint[] = [
    { coords: ride.origin.coords, label: ride.origin.address, kind: "origin" },
    ...ride.pickups.map((p, i) => ({
      coords: p.coords, label: p.address, kind: "pickup" as const, index: i + 1,
    })),
    { coords: ride.destination.coords, label: ride.destination.address, kind: "destination" },
  ];

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
            {totalPickups > 1 && <span className="ml-1.5 text-warning">· {totalPickups} paradas</span>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-bold tabular text-primary">{formatBRL(ride.price)}</p>
          <p className="text-[10px] text-muted-foreground tabular">{formatKm(ride.totalKm)}</p>
        </div>
      </header>

      <div className="overflow-hidden">
        <RouteMap className="h-72 w-full" points={mapPoints} path={path} />
      </div>

      <div className="px-4 pt-5">
        {!isCompleted && (
          <div
            className={cn(
              "relative overflow-hidden rounded-3xl border p-5 shadow-elevated",
              phase === "pickup" ? "border-warning/40 bg-warning/10" : "border-primary/40 bg-primary/10"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                phase === "pickup" ? "bg-warning text-background" : "bg-primary text-primary-foreground"
              )}>
                {phase === "pickup" ? <User className="h-5 w-5" strokeWidth={2.4} /> : <Flag className="h-5 w-5" strokeWidth={2.4} />}
                <span className="pulse-ring absolute inset-0 rounded-full" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {phase === "pickup"
                    ? `Status — Indo buscar B${pickupIdx + 1}${totalPickups > 1 ? ` (${pickupIdx + 1}/${totalPickups})` : ""}`
                    : "Status — Em viagem ao destino"}
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
          {ride.pickups.map((p, i) => {
            const legKm = ride.legsKm[i] ?? 0;
            const isCurrent = phase === "pickup" && i === pickupIdx && !isCompleted;
            const passed = phase === "trip" || (phase === "pickup" && i < pickupIdx);
            return (
              <RouteRow
                key={i}
                color="bg-warning"
                tag={`B${i + 1}`}
                label={`Coleta ${i + 1} · ${formatKm(legKm)}`}
                address={p.address}
                active={isCurrent}
                dim={passed}
              />
            );
          })}
          <RouteRow
            color="bg-info"
            tag="C"
            label={`Destino · ${formatKm(ride.legsKm[ride.legsKm.length - 1] ?? 0)}`}
            address={ride.destination.address}
            active={phase === "trip" && !isCompleted}
          />
        </div>

        {ride.notes && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Obs:</span> {ride.notes}
          </div>
        )}

        <div className="h-32" />
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
            {phase === "pickup" ? (<><User className="h-4 w-4" /> {advanceLabel}</>) : (<><Flag className="h-4 w-4" /> {advanceLabel}</>)}
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
      <div className={cn("mt-0.5 flex h-7 min-w-[1.75rem] shrink-0 items-center justify-center rounded-full px-1 text-xs font-bold text-background", color)}>
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
