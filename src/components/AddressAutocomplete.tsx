import { useEffect, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getCurrentLocation, loadGoogleMaps, reverseGeocode } from "@/lib/googleMaps";
import type { RidePoint } from "@/types/ride";
import { toast } from "sonner";

interface AddressAutocompleteProps {
  value: RidePoint | null;
  onChange: (point: RidePoint | null) => void;
  placeholder?: string;
  showLocateButton?: boolean;
  inputClassName?: string;
  ariaLabel?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Buscar endereço",
  showLocateButton = false,
  inputClassName,
  ariaLabel,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [text, setText] = useState(value?.address ?? "");
  const [locating, setLocating] = useState(false);
  const [ready, setReady] = useState(false);

  // Sync external value into input
  useEffect(() => {
    setText(value?.address ?? "");
  }, [value?.address]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !inputRef.current || acRef.current) return;
        const ac = new g.maps.places.Autocomplete(inputRef.current, {
          fields: ["place_id", "formatted_address", "geometry", "name"],
          componentRestrictions: { country: ["br"] },
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const loc = place.geometry?.location;
          if (!loc) return;
          const point: RidePoint = {
            address: place.formatted_address ?? place.name ?? "",
            coords: { lat: loc.lat(), lng: loc.lng() },
            placeId: place.place_id,
          };
          setText(point.address);
          onChange(point);
        });
        acRef.current = ac;
        setReady(true);
      })
      .catch((err) => {
        console.error("Google Maps load error", err);
        toast.error("Falha ao carregar Google Maps. Verifique a chave da API.");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function useMyLocation() {
    setLocating(true);
    try {
      const coords = await getCurrentLocation();
      const address = await reverseGeocode(coords);
      const point: RidePoint = { address, coords };
      setText(address);
      onChange(point);
      toast.success("Localização atual definida.");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível obter sua localização.");
    } finally {
      setLocating(false);
    }
  }

  function clear() {
    setText("");
    onChange(null);
    inputRef.current?.focus();
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            // If user typed but never picked a place, drop selection so we don't keep stale coords
            if (value && text.trim() !== value.address) {
              // keep typed text but no coords until they pick
              onChange(null);
            }
          }}
          placeholder={ready ? placeholder : "Carregando Google Maps..."}
          aria-label={ariaLabel}
          autoComplete="off"
          className={cn("pr-9", inputClassName)}
        />
        <MapPin className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {text && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary"
            aria-label="Limpar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {showLocateButton && (
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating || !ready}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-secondary-foreground transition-smooth active:scale-95 hover:border-primary/40",
            (locating || !ready) && "opacity-60"
          )}
          aria-label="Usar minha localização"
          title="Usar minha localização"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
