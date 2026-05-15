import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown, ArrowLeft, ArrowUp, Calculator, Clock, Loader2, Plus, Save, Trash2, User, Zap,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RouteMap, type RoutePoint } from "@/components/RouteMap";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRatePerKm, useRides } from "@/hooks/useRides";
import { formatBRL, formatKm } from "@/lib/geo";
import { getDirections, type DirectionsResult } from "@/lib/googleMaps";
import type { LatLng, Ride, RidePoint } from "@/types/ride";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_PICKUPS = 10;

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function NewRide() {
  const nav = useNavigate();
  const { addRide } = useRides();
  const [rate, setRate] = useRatePerKm();

  const [clientName, setClientName] = useState("");
  const [origin, setOrigin] = useState<RidePoint | null>(null);
  const [pickups, setPickups] = useState<(RidePoint | null)[]>([]);
  const [destination, setDestination] = useState<RidePoint | null>(null);
  const [scheduledAt, setScheduledAt] = useState(nowLocalInput());
  const [notes, setNotes] = useState("");

  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [route, setRoute] = useState<DirectionsResult | null>(null);

  // Debounced route recalculation when all critical points are filled
  const validPickups = useMemo(
    () => pickups.filter((p): p is RidePoint => !!p),
    [pickups]
  );
  const canRoute = !!origin && !!destination && validPickups.length === pickups.length;

  const fingerprint = useMemo(() => {
    if (!canRoute || !origin || !destination) return "";
    const f = (p: LatLng) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
    return [f(origin.coords), ...validPickups.map((p) => f(p.coords)), f(destination.coords)].join(">");
  }, [canRoute, origin, destination, validPickups]);

  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!fingerprint || !origin || !destination) {
      setRoute(null);
      setRouteError(null);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setRouting(true);
      setRouteError(null);
      try {
        const result = await getDirections(
          origin.coords,
          validPickups.map((p) => p.coords),
          destination.coords
        );
        setRoute(result);
      } catch (e: any) {
        console.error(e);
        setRouteError(e?.message ?? "Falha ao calcular rota.");
        setRoute(null);
      } finally {
        setRouting(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [fingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalKm = route?.totalKm ?? 0;
  const price = totalKm * rate;
  const lastLegKm = route?.legs[route.legs.length - 1]?.distanceKm ?? 0;
  const pickupLegsKm = (route?.legs ?? []).slice(0, -1).reduce((s, l) => s + l.distanceKm, 0);

  const canSave = clientName.trim() && canRoute && !!route && totalKm > 0;

  function setPickupAt(index: number, point: RidePoint | null) {
    setPickups((prev) => prev.map((p, i) => (i === index ? point : p)));
  }
  function addPickup() {
    if (pickups.length >= MAX_PICKUPS) {
      toast.error(`Máximo de ${MAX_PICKUPS} coletas.`);
      return;
    }
    setPickups((prev) => [...prev, null]);
  }
  function removePickup(index: number) {
    setPickups((prev) => prev.filter((_, i) => i !== index));
  }
  function move(index: number, dir: -1 | 1) {
    setPickups((prev) => {
      const next = prev.slice();
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  function buildRide(): Ride {
    const legs = route!.legs.map((l) => +l.distanceKm.toFixed(2));
    return {
      id: crypto.randomUUID(),
      clientName: clientName.trim(),
      scheduledAt: new Date(scheduledAt).toISOString(),
      origin: origin!,
      pickups: validPickups,
      destination: destination!,
      ratePerKm: rate,
      legsKm: legs,
      distancePickupKm: +pickupLegsKm.toFixed(2),
      distanceTripKm: +lastLegKm.toFixed(2),
      totalKm: +totalKm.toFixed(2),
      price: +price.toFixed(2),
      status: "scheduled",
      currentPickupIndex: 0,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
  }

  function save(start: boolean) {
    if (!canSave) {
      toast.error("Preencha cliente e selecione todos os endereços nos campos.");
      return;
    }
    const ride = buildRide();
    if (start) {
      ride.status = "pickup";
      ride.currentPickupIndex = 0;
    }
    addRide(ride);
    toast.success(start ? "Corrida iniciada!" : "Agendamento salvo.");
    nav(start ? `/corrida/${ride.id}` : "/agenda");
  }

  // Build map points from current state
  const mapPoints: RoutePoint[] = useMemo(() => {
    const pts: RoutePoint[] = [];
    if (origin) pts.push({ coords: origin.coords, label: origin.address, kind: "origin" });
    validPickups.forEach((p, i) =>
      pts.push({ coords: p.coords, label: p.address, kind: "pickup", index: i + 1 })
    );
    if (destination) pts.push({ coords: destination.coords, label: destination.address, kind: "destination" });
    return pts;
  }, [origin, validPickups, destination]);

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
        <div>
          <h1 className="text-base font-semibold leading-tight">Calculadora de Trajeto Pró</h1>
          <p className="text-xs text-muted-foreground">Múltiplas coletas com rota real</p>
        </div>
      </header>

      <div className="space-y-5 px-4 pt-5">
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <Field label="Cliente" icon={<User className="h-4 w-4" />}>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome do passageiro" />
          </Field>
          <Field label="Quando" icon={<Clock className="h-4 w-4" />}>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </Field>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
          <PointBlock color="bg-primary" tag="A" label="Local de partida">
            <AddressAutocomplete
              value={origin}
              onChange={setOrigin}
              placeholder="Endereço de partida"
              showLocateButton
              ariaLabel="Local de partida"
            />
          </PointBlock>

          {pickups.map((p, i) => (
            <PointBlock
              key={i}
              color="bg-warning"
              tag={`B${i + 1}`}
              label={`Coleta ${i + 1}${pickups.length > 1 ? ` de ${pickups.length}` : ""}`}
              actions={
                <div className="flex items-center gap-1">
                  <IconBtn onClick={() => move(i, -1)} disabled={i === 0} aria="Subir">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn onClick={() => move(i, 1)} disabled={i === pickups.length - 1} aria="Descer">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn onClick={() => removePickup(i)} disabled={pickups.length === 1} aria="Remover" danger>
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconBtn>
                </div>
              }
            >
              <AddressAutocomplete
                value={p}
                onChange={(np) => setPickupAt(i, np)}
                placeholder="Endereço da coleta"
                ariaLabel={`Coleta ${i + 1}`}
              />
            </PointBlock>
          ))}

          <button
            type="button"
            onClick={addPickup}
            disabled={pickups.length >= MAX_PICKUPS}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-secondary/40 py-2.5 text-xs font-semibold text-muted-foreground transition-smooth hover:border-warning/50 hover:text-warning",
              pickups.length >= MAX_PICKUPS && "cursor-not-allowed opacity-50"
            )}
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar coleta {pickups.length >= MAX_PICKUPS && `(máx. ${MAX_PICKUPS})`}
          </button>

          <PointBlock color="bg-info" tag="C" label="Destino final">
            <AddressAutocomplete
              value={destination}
              onChange={setDestination}
              placeholder="Endereço de destino"
              ariaLabel="Destino final"
            />
          </PointBlock>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="relative">
            <RouteMap
              className="h-56 w-full"
              points={mapPoints}
              path={route?.path}
            />
            {routing && (
              <div className="pointer-events-none absolute right-2 top-2 flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur">
                <Loader2 className="h-3 w-3 animate-spin" /> calculando rota...
              </div>
            )}
          </div>
          {routeError && (
            <div className="border-t border-border bg-destructive/10 px-4 py-2 text-xs text-destructive">
              {routeError}
            </div>
          )}
          {route && route.legs.length > 0 && (
            <div className="border-t border-border">
              <ul className="divide-y divide-border text-xs">
                {route.legs.map((leg, i) => {
                  const isFinal = i === route.legs.length - 1;
                  const fromLabel = i === 0 ? "A" : `B${i}`;
                  const toLabel = isFinal ? "C" : `B${i + 1}`;
                  return (
                    <li key={i} className="flex items-center justify-between px-4 py-2">
                      <span className="font-medium text-muted-foreground">
                        {fromLabel} → {toLabel}
                      </span>
                      <span className="tabular text-foreground">
                        {formatKm(leg.distanceKm)} · {Math.round(leg.durationMin)} min
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="rate" className="flex items-center gap-2 text-sm font-medium">
              <Calculator className="h-4 w-4 text-primary" /> Valor por km
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">R$</span>
              <Input
                id="rate"
                inputMode="decimal"
                className="w-24 text-right tabular"
                value={String(rate)}
                onChange={(e) => setRate(Number(e.target.value.replace(",", ".")) || 0)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-5 shadow-elevated">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/90">Preço sugerido</p>
              <p className="mt-1 text-4xl font-extrabold tabular text-foreground">{formatBRL(price)}</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p className="tabular">{formatKm(totalKm)} totais</p>
              <p className="tabular">× {formatBRL(rate)}/km</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <Label className="text-xs text-muted-foreground">Observações (opcional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: cliente com pet, parada extra..."
            rows={2}
            className="mt-2 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pb-4">
          <button
            onClick={() => save(false)}
            disabled={!canSave}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl border border-border bg-secondary py-4 text-sm font-semibold text-secondary-foreground transition-smooth active:scale-[0.98]",
              !canSave && "opacity-50"
            )}
          >
            <Save className="h-4 w-4" /> Agendar
          </button>
          <button
            onClick={() => save(true)}
            disabled={!canSave}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-glow transition-spring active:scale-[0.98]",
              !canSave && "opacity-50"
            )}
          >
            <Zap className="h-4 w-4" strokeWidth={2.6} /> Iniciar agora
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <Label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function PointBlock({
  color, tag, label, actions, children,
}: {
  color: string; tag: string; label: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Label className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <span className={cn("inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-background", color)}>{tag}</span>
          {label}
        </Label>
        {actions}
      </div>
      {children}
    </div>
  );
}

function IconBtn({
  children, onClick, disabled, aria, danger,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean; aria: string; danger?: boolean; }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={aria}
      title={aria}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-smooth hover:border-primary/40 hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40 hover:border-border hover:text-muted-foreground",
        danger && !disabled && "hover:border-destructive/50 hover:text-destructive"
      )}
    >
      {children}
    </button>
  );
}
