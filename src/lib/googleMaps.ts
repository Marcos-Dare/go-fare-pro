import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import type { LatLng } from "@/types/ride";

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

let initialized = false;
let loaderPromise: Promise<typeof google.maps> | null = null;

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (!apiKey) {
    return Promise.reject(
      new Error("VITE_GOOGLE_MAPS_API_KEY ausente. Configure no arquivo .env.")
    );
  }
  if (!loaderPromise) {
    if (!initialized) {
      setOptions({
        key: apiKey,
        v: "weekly",
        language: "pt-BR",
        region: "BR",
      });
      initialized = true;
    }
    loaderPromise = (async () => {
      await Promise.all([
        importLibrary("maps"),
        importLibrary("places"),
        importLibrary("geometry"),
        importLibrary("routes"),
      ]);
      return google.maps;
    })();
  }
  return loaderPromise;
}

export interface DirectionsLeg {
  distanceKm: number;
  durationMin: number;
}

export interface DirectionsResult {
  legs: DirectionsLeg[];
  totalKm: number;
  totalMin: number;
  /** Encoded polyline points (lat/lng pairs) for the entire route */
  path: LatLng[];
}

/**
 * Calls Directions API for ordered waypoints: origin -> pickups[] -> destination.
 */
export async function getDirections(
  origin: LatLng,
  pickups: LatLng[],
  destination: LatLng
): Promise<DirectionsResult> {
  await loadGoogleMaps();
  const svc = new google.maps.DirectionsService();

  const res = await svc.route({
    origin,
    destination,
    waypoints: pickups.map((p) => ({ location: p, stopover: true })),
    travelMode: google.maps.TravelMode.DRIVING,
    optimizeWaypoints: false,
    region: "br",
  });

  const route = res.routes[0];
  if (!route) throw new Error("Sem rota disponível.");

  const legs: DirectionsLeg[] = route.legs.map((l) => ({
    distanceKm: (l.distance?.value ?? 0) / 1000,
    durationMin: (l.duration?.value ?? 0) / 60,
  }));

  const path: LatLng[] = route.overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() }));

  const totalKm = legs.reduce((s, l) => s + l.distanceKm, 0);
  const totalMin = legs.reduce((s, l) => s + l.durationMin, 0);
  return { legs, totalKm, totalMin, path };
}

export async function reverseGeocode(coords: LatLng): Promise<string> {
  await loadGoogleMaps();
  const geocoder = new google.maps.Geocoder();
  const res = await geocoder.geocode({ location: coords, language: "pt-BR" });
  return res.results[0]?.formatted_address ?? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
}

export function getCurrentLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalização não suportada."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}
