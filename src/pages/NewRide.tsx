import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, Clock, MapPin, Navigation, Save, User, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RouteMap } from "@/components/RouteMap";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRatePerKm, useRides } from "@/hooks/useRides";
import { fakeGeocode, formatBRL, formatKm, haversineKm } from "@/lib/geo";
import type { Ride } from "@/types/ride";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [origin, setOrigin] = useState("Minha localização atual");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [scheduledAt, setScheduledAt] = useState(nowLocalInput());
  const [notes, setNotes] = useState("");

  const computed = useMemo(() => {
    const oCoords = fakeGeocode(origin);
    const pCoords = fakeGeocode(pickup);
    const dCoords = fakeGeocode(destination);
    const distA = pickup ? haversineKm(oCoords, pCoords) : 0;
    const distB = destination && pickup ? haversineKm(pCoords, dCoords) : 0;
    const total = distA + distB;
    return {
      oCoords, pCoords, dCoords,
      distA, distB, total,
      price: total * rate,
    };
  }, [origin, pickup, destination, rate]);

  const canSave = clientName.trim() && pickup.trim() && destination.trim() && computed.total > 0;

  function buildRide(): Ride {
    return {
      id: crypto.randomUUID(),
      clientName: clientName.trim(),
      scheduledAt: new Date(scheduledAt).toISOString(),
      origin: { address: origin, coords: computed.oCoords },
      pickup: { address: pickup, coords: computed.pCoords },
      destination: { address: destination, coords: computed.dCoords },
      ratePerKm: rate,
      distancePickupKm: +computed.distA.toFixed(2),
      distanceTripKm: +computed.distB.toFixed(2),
      totalKm: +computed.total.toFixed(2),
      price: +computed.price.toFixed(2),
      status: "scheduled",
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
  }

  function save(start: boolean) {
    if (!canSave) {
      toast.error("Preencha cliente, coleta e destino.");
      return;
    }
    const ride = buildRide();
    if (start) ride.status = "pickup";
    addRide(ride);
    toast.success(start ? "Corrida iniciada!" : "Agendamento salvo.");
    nav(start ? `/corrida/${ride.id}` : "/agenda");
  }

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
          <p className="text-xs text-muted-foreground">Calcule e salve uma nova corrida</p>
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

        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <PointField
            color="bg-primary"
            tag="A"
            label="Local de partida"
            value={origin}
            onChange={setOrigin}
            placeholder="Minha localização atual"
          />
          <div className="ml-3 h-4 w-px bg-border" aria-hidden />
          <PointField
            color="bg-warning"
            tag="B"
            label="Coleta — endereço do cliente"
            value={pickup}
            onChange={setPickup}
            placeholder="Ex: Rua das Flores, 200"
          />
          <div className="ml-3 h-4 w-px bg-border" aria-hidden />
          <PointField
            color="bg-info"
            tag="C"
            label="Destino final"
            value={destination}
            onChange={setDestination}
            placeholder="Ex: Aeroporto de Congonhas"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <RouteMap className="h-56 w-full" points={[
            { coords: computed.oCoords, label: origin || "Origem", kind: "origin" },
            ...(pickup ? [{ coords: computed.pCoords, label: pickup, kind: "pickup" as const }] : []),
            ...(destination ? [{ coords: computed.dCoords, label: destination, kind: "destination" as const }] : []),
          ]} />
          <div className="grid grid-cols-2 divide-x divide-border border-t border-border text-center">
            <div className="p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Fase A · Coleta</p>
              <p className="mt-0.5 text-sm font-semibold tabular">{formatKm(computed.distA)}</p>
            </div>
            <div className="p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Fase B · Viagem</p>
              <p className="mt-0.5 text-sm font-semibold tabular">{formatKm(computed.distB)}</p>
            </div>
          </div>
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
              <p className="mt-1 text-4xl font-extrabold tabular text-foreground">{formatBRL(computed.price)}</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p className="tabular">{formatKm(computed.total)} totais</p>
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

function PointField({
  color, tag, label, value, onChange, placeholder,
}: {
  color: string; tag: string; label: string; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn("mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-background", color)}>
        {tag}
      </div>
      <div className="min-w-0 flex-1">
        <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-0.5 border-0 bg-transparent px-0 text-sm font-medium focus-visible:ring-0"
        />
      </div>
      <MapPin className="mt-2 h-4 w-4 text-muted-foreground" />
    </div>
  );
}
