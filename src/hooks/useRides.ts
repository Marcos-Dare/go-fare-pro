import { useCallback, useEffect, useState } from "react";
import type { Ride, RideStatus } from "@/types/ride";

const STORAGE_KEY = "drivercalc.rides.v1";
const RATE_KEY = "drivercalc.rate.v1";

function read(): Ride[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Ride[]) : [];
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

  const setStatus = useCallback((id: string, status: RideStatus) => {
    const patch: Partial<Ride> = { status };
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
