import { useEffect, useMemo, useRef } from "react";
import type { LatLng } from "@/types/ride";
import { loadGoogleMaps } from "@/lib/googleMaps";

export interface RoutePoint {
  coords: LatLng;
  label: string;
  kind: "origin" | "pickup" | "destination";
  /** For pickups, 1-based index used in marker (B1, B2, ...) */
  index?: number;
}

interface RouteMapProps {
  points: RoutePoint[];
  /** Optional precomputed route polyline (decoded). If absent, falls back to straight segments. */
  path?: LatLng[];
  className?: string;
  /** Highlight the active leg only. Use the destination index of the leg (point index >= 1). */
  activeLegToIndex?: number | null;
}

const DARK_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0f1419" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f1419" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9aa5b1" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1c2733" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1c2733" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0b1014" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2a3744" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#0b1014" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a1320" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3b6080" }] },
];

function pinSvg(color: string, label: string) {
  // Returns a data URL for an SVG circular pin marker with a label
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r="14" fill="${color}" stroke="#ffffff" stroke-width="2.5"/>
      <text x="17" y="21" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="800" fill="#0b1014">${label}</text>
    </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

const COLORS = {
  origin: "#22d3a8",
  pickup: "#facc15",
  destination: "#60a5fa",
};

export function RouteMap({ points, path, className, activeLegToIndex = null }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polysRef = useRef<google.maps.Polyline[]>([]);
  const fullPolyRef = useRef<google.maps.Polyline | null>(null);

  const fingerprint = useMemo(
    () =>
      points.map((p) => `${p.kind}${p.index ?? ""}:${p.coords.lat.toFixed(5)},${p.coords.lng.toFixed(5)}`).join("|") +
      "|p:" + (path?.length ?? 0) +
      "|active:" + (activeLegToIndex ?? "x"),
    [points, path, activeLegToIndex]
  );

  // Init map
  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current) return;

    loadGoogleMaps().then((g) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      mapRef.current = new g.maps.Map(containerRef.current, {
        center: { lat: -23.5505, lng: -46.6333 },
        zoom: 12,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
        clickableIcons: false,
        backgroundColor: "#0f1419",
        styles: DARK_STYLES,
      });
    }).catch((err) => {
      console.error("Google Maps load error", err);
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap(null));
      polysRef.current.forEach((p) => p.setMap(null));
      fullPolyRef.current?.setMap(null);
      markersRef.current = [];
      polysRef.current = [];
      fullPolyRef.current = null;
      mapRef.current = null;
    };
  }, []);

  // Render markers + polylines
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;

    // Clear previous
    markersRef.current.forEach((m) => m.setMap(null));
    polysRef.current.forEach((p) => p.setMap(null));
    fullPolyRef.current?.setMap(null);
    markersRef.current = [];
    polysRef.current = [];
    fullPolyRef.current = null;

    if (points.length === 0) return;

    const g = window.google;

    // Markers
    points.forEach((p) => {
      const label =
        p.kind === "origin" ? "A" :
        p.kind === "destination" ? "C" :
        `B${p.index ?? ""}`;
      const marker = new g.maps.Marker({
        position: p.coords,
        map,
        icon: {
          url: pinSvg(COLORS[p.kind], label),
          scaledSize: new g.maps.Size(34, 34),
          anchor: new g.maps.Point(17, 17),
        },
        title: p.label,
        zIndex: p.kind === "destination" ? 30 : p.kind === "origin" ? 20 : 10,
      });
      markersRef.current.push(marker);
    });

    // Route rendering
    if (path && path.length > 1) {
      // Draw full route polyline
      fullPolyRef.current = new g.maps.Polyline({
        path,
        map,
        strokeColor: "#22d3a8",
        strokeOpacity: 0.95,
        strokeWeight: 5,
      });
    } else {
      // Fallback: straight segments between consecutive points
      for (let i = 0; i < points.length - 1; i++) {
        const from = points[i];
        const to = points[i + 1];
        const isActive = activeLegToIndex == null || activeLegToIndex === i + 1;
        const color = to.kind === "destination" ? "#22d3a8" : "#facc15";
        const poly = new g.maps.Polyline({
          path: [from.coords, to.coords],
          map,
          strokeColor: color,
          strokeOpacity: isActive ? 0.95 : 0.35,
          strokeWeight: to.kind === "destination" ? 5 : 4,
          icons: to.kind === "destination" ? undefined : [{
            icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
            offset: "0",
            repeat: "12px",
          }],
        });
        polysRef.current.push(poly);
      }
    }

    // Fit bounds
    const bounds = new g.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p.coords));
    if (path) path.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 48);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setTimeout(() => g.maps.event.trigger(map, "resize"), 50);
  }, [fingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className={className} />;
}
