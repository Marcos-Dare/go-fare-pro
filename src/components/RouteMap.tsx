import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import type { LatLng } from "@/types/ride";

interface RouteMapProps {
  points: { coords: LatLng; label: string; kind: "origin" | "pickup" | "destination" }[];
  className?: string;
  highlightLeg?: "pickup" | "trip" | "all";
}

const colorByKind: Record<string, string> = {
  origin: "#22d3a8",
  pickup: "#facc15",
  destination: "#60a5fa",
};

function makeIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};
      width:28px;height:28px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 6px 16px rgba(0,0,0,0.45), 0 0 0 4px rgba(0,0,0,0.35);
      color:#0b1014;font-weight:800;font-size:13px;font-family:Inter,sans-serif;
      border:2px solid rgba(255,255,255,0.9);
    ">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function RouteMap({ points, className, highlightLeg = "all" }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const fingerprint = useMemo(
    () => points.map((p) => `${p.kind}:${p.coords.lat.toFixed(4)},${p.coords.lng.toFixed(4)}`).join("|") + "|" + highlightLeg,
    [points, highlightLeg]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
    }).setView([-23.5505, -46.6333], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    if (points.length === 0) return;

    const labelMap: Record<string, string> = { origin: "A", pickup: "B", destination: "C" };

    points.forEach((p) => {
      L.marker([p.coords.lat, p.coords.lng], {
        icon: makeIcon(colorByKind[p.kind], labelMap[p.kind] ?? "•"),
      })
        .bindTooltip(p.label, { direction: "top", offset: [0, -14] })
        .addTo(layer);
    });

    // legs
    const origin = points.find((p) => p.kind === "origin");
    const pickup = points.find((p) => p.kind === "pickup");
    const destination = points.find((p) => p.kind === "destination");

    if (origin && pickup) {
      L.polyline(
        [[origin.coords.lat, origin.coords.lng], [pickup.coords.lat, pickup.coords.lng]],
        {
          color: highlightLeg === "trip" ? "#52606d" : "#facc15",
          weight: 4,
          dashArray: "6 8",
          opacity: highlightLeg === "trip" ? 0.4 : 0.95,
        }
      ).addTo(layer);
    }
    if (pickup && destination) {
      L.polyline(
        [[pickup.coords.lat, pickup.coords.lng], [destination.coords.lat, destination.coords.lng]],
        {
          color: highlightLeg === "pickup" ? "#52606d" : "#22d3a8",
          weight: 5,
          opacity: highlightLeg === "pickup" ? 0.4 : 0.95,
        }
      ).addTo(layer);
    }

    const bounds = L.latLngBounds(points.map((p) => [p.coords.lat, p.coords.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    setTimeout(() => map.invalidateSize(), 50);
  }, [fingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className={className} />;
}
