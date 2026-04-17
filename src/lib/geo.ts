import type { LatLng } from "@/types/ride";

/** Distância em km entre dois pontos via Haversine. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Geocodificação simulada: gera um ponto determinístico a partir do texto, próximo a um centro padrão. */
export function fakeGeocode(address: string, center: LatLng = { lat: -23.5505, lng: -46.6333 }): LatLng {
  if (!address.trim()) return center;
  let hash = 0;
  for (let i = 0; i < address.length; i++) hash = (hash * 31 + address.charCodeAt(i)) | 0;
  const r1 = ((hash & 0xffff) / 0xffff - 0.5) * 0.18; // ~10km
  const r2 = (((hash >> 16) & 0xffff) / 0xffff - 0.5) * 0.18;
  return { lat: +(center.lat + r1).toFixed(6), lng: +(center.lng + r2).toFixed(6) };
}

export function formatKm(km: number) {
  return `${km.toFixed(1).replace(".", ",")} km`;
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
