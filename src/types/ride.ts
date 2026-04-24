export type RideStatus = "scheduled" | "pickup" | "ongoing" | "completed";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RidePoint {
  address: string;
  coords: LatLng;
  placeId?: string;
}

export interface Ride {
  id: string;
  clientName: string;
  scheduledAt: string; // ISO
  origin: RidePoint;            // motorista (A)
  pickups: RidePoint[];         // 1..10 paradas de coleta (B1..Bn)
  destination: RidePoint;       // destino final (C)
  ratePerKm: number;
  /** Distâncias por trecho (origin->pickup1, pickup1->pickup2, ..., pickupN->destination). length = pickups.length + 1 */
  legsKm: number[];
  /** Para compatibilidade visual: soma dos trechos de coleta (origin->...->ultimaColeta) */
  distancePickupKm: number;
  /** Distância do último pickup -> destination */
  distanceTripKm: number;
  totalKm: number;
  price: number;
  status: RideStatus;
  /** Índice da próxima coleta a buscar (0..pickups.length-1) durante a fase pickup */
  currentPickupIndex?: number;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}
