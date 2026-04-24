import { useCallback, useEffect, useState } from "react";
import type { Ride, RidePoint, RideStatus } from "@/types/ride";

const STORAGE_KEY = "drivercalc.rides.v1";
const RATE_KEY = "drivercalc.rate.v1";

// Migrate legacy rides (single pickup field) to new shape with pickups[]
function migrate(raw: any): Ride {
  if (Array.isArray(raw.pickups)) {
    return {
      ...raw,
      legsKm: Array.isArray(raw.legsKm)
        ? raw.legsKm
        : [raw.distancePickupKm ?? 0, raw.distanceTripKm ?? 0],
    } as Ride;
  }
  const pickup: RidePoint | undefined = raw.pickup;
  const pickups: RidePoint[] = pickup ? [pickup] : [];
  return {
    id: raw.id,
    clientName: raw.clientName,
    scheduledAt: raw.scheduledAt,
    origin: raw.origin,
    pickups,
    destination: raw.destination,
    ratePerKm: raw.ratePerKm,
    legsKm: [raw.distancePickupKm ?? 0, raw.distanceTripKm ?? 0],
    distancePickupKm: raw.distancePickupKm ?? 0,
    distanceTripKm: raw.distanceTripKm ?? 0,
    totalKm: raw.totalKm ?? 0,
    price: raw.price ?? 0,
    status: raw.status,
    currentPickupIndex: raw.currentPickupIndex,
    notes: raw.notes,
    createdAt: raw.createdAt,
    completedAt: raw.completedAt,
  };
}

function read(): Ride[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as any[];
    return arr.map(migrate);
  } catch {
    return [];
  }
}

function write(rides: Ride[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rides));
  window.dispatchEvent(new Event("drivercalc:rides"));
}

export function useRides() {
  const [rides, setRides] = useState<Ride[]>(() => read());

  useEffect(() => {
    const sync = () => setRides(read());
    window.addEventListener("drivercalc:rides", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("drivercalc:rides", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const addRide = useCallback((ride: Ride) => {
    const next = [...read(), ride].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
    write(next);
  }, []);

  const updateRide = useCallback((id: string, patch: Partial<Ride>) => {
    const next = read().map((r) => (r.id === id ? { ...r, ...patch } : r));
    write(next);
  }, []);

  const deleteRide = useCallback((id: string) => {
    write(read().filter((r) => r.id !== id));
  }, []);

  const setStatus = useCallback((id: string, status: RideStatus, extra?: Partial<Ride>) => {
    const patch: Partial<Ride> = { status, ...extra };
    if (status === "completed") patch.completedAt = new Date().toISOString();
    const next = read().map((r) => (r.id === id ? { ...r, ...patch } : r));
    write(next);
  }, []);

  return { rides, addRide, updateRide, deleteRide, setStatus };
}

export function useRatePerKm() {
  const [rate, setRate] = useState<number>(() => {
    const raw = localStorage.getItem(RATE_KEY);
    return raw ? Number(raw) : 2.5;
  });

  useEffect(() => {
    localStorage.setItem(RATE_KEY, String(rate));
  }, [rate]);

  return [rate, setRate] as const;
}
