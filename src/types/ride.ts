export type RideStatus = "scheduled" | "pickup" | "ongoing" | "completed";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RidePoint {
  address: string;
  coords: LatLng;
}

export interface Ride {
  id: string;
  clientName: string;
  scheduledAt: string; // ISO
  origin: RidePoint;       // motorista
  pickup: RidePoint;       // cliente
  destination: RidePoint;  // destino final
  ratePerKm: number;
  distancePickupKm: number; // fase A
  distanceTripKm: number;   // fase B
  totalKm: number;
  price: number;
  status: RideStatus;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}
