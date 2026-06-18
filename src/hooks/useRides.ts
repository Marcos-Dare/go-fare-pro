import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Ride, RidePoint, RideStatus } from "@/types/ride";

function rowToRide(row: any): Ride {
  return {
    id: row.id,
    clientName: row.client_name,
    scheduledAt: row.scheduled_at,
    origin: row.origin as RidePoint,
    pickups: (row.pickups ?? []) as RidePoint[],
    destination: row.destination as RidePoint,
    ratePerKm: Number(row.rate_per_km ?? 0),
    legsKm: (row.legs_km ?? []).map((n: any) => Number(n)),
    distancePickupKm: Number(row.distance_pickup_km ?? 0),
    distanceTripKm: Number(row.distance_trip_km ?? 0),
    totalKm: Number(row.total_km ?? 0),
    price: Number(row.price ?? 0),
    status: row.status as RideStatus,
    currentPickupIndex: row.current_pickup_index ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
  };
}

function rideToRow(ride: Partial<Ride>): Record<string, any> {
  const row: Record<string, any> = {};
  if (ride.id !== undefined) row.id = ride.id;
  if (ride.clientName !== undefined) row.client_name = ride.clientName;
  if (ride.scheduledAt !== undefined) row.scheduled_at = ride.scheduledAt;
  if (ride.origin !== undefined) row.origin = ride.origin;
  if (ride.pickups !== undefined) row.pickups = ride.pickups;
  if (ride.destination !== undefined) row.destination = ride.destination;
  if (ride.ratePerKm !== undefined) row.rate_per_km = ride.ratePerKm;
  if (ride.legsKm !== undefined) row.legs_km = ride.legsKm;
  if (ride.distancePickupKm !== undefined) row.distance_pickup_km = ride.distancePickupKm;
  if (ride.distanceTripKm !== undefined) row.distance_trip_km = ride.distanceTripKm;
  if (ride.totalKm !== undefined) row.total_km = ride.totalKm;
  if (ride.price !== undefined) row.price = ride.price;
  if (ride.status !== undefined) row.status = ride.status;
  if (ride.currentPickupIndex !== undefined) row.current_pickup_index = ride.currentPickupIndex;
  if (ride.notes !== undefined) row.notes = ride.notes;
  if (ride.completedAt !== undefined) row.completed_at = ride.completedAt;
  return row;
}

export function useRides() {
  const { user } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;

  const refresh = useCallback(async () => {
    if (!userIdRef.current) {
      setRides([]);
      return;
    }
    const { data, error } = await supabase
      .from("rides")
      .select("*")
      .order("scheduled_at", { ascending: true });
    if (error) {
      console.error("[useRides] fetch failed", error);
      return;
    }
    setRides((data ?? []).map(rowToRide));
  }, []);

  useEffect(() => {
    refresh();
  }, [user?.id, refresh]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`rides-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rides", filter: `user_id=eq.${user.id}` },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refresh]);

  const addRide = useCallback(async (ride: Ride) => {
    const uid = userIdRef.current;
    if (!uid) return;
    const row = { ...rideToRow(ride), user_id: uid };
    const { error } = await supabase.from("rides").insert(row);
    if (error) console.error("[useRides] insert failed", error);
    await refresh();
  }, [refresh]);

  const updateRide = useCallback(async (id: string, patch: Partial<Ride>) => {
    const { error } = await supabase.from("rides").update(rideToRow(patch)).eq("id", id);
    if (error) console.error("[useRides] update failed", error);
    await refresh();
  }, [refresh]);

  const deleteRide = useCallback(async (id: string) => {
    const { error } = await supabase.from("rides").delete().eq("id", id);
    if (error) console.error("[useRides] delete failed", error);
    await refresh();
  }, [refresh]);

  const setStatus = useCallback(
    async (id: string, status: RideStatus, extra?: Partial<Ride>) => {
      const patch: Partial<Ride> = { status, ...extra };
      if (status === "completed") patch.completedAt = new Date().toISOString();
      await updateRide(id, patch);
    },
    [updateRide]
  );

  return { rides, addRide, updateRide, deleteRide, setStatus, refresh };
}

export function useRatePerKm() {
  const { user } = useAuth();
  const [rate, setRateState] = useState<number>(2.5);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from("user_settings")
      .select("rate_per_km")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.rate_per_km != null) setRateState(Number(data.rate_per_km));
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const setRate = useCallback(
    (value: number) => {
      setRateState(value);
      const uid = user?.id;
      if (!uid) return;
      void supabase
        .from("user_settings")
        .upsert({ user_id: uid, rate_per_km: value }, { onConflict: "user_id" });
    },
    [user?.id]
  );

  return [rate, setRate] as const;
}
