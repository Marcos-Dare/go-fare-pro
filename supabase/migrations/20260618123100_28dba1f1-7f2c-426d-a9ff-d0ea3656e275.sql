
CREATE TABLE public.rides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  origin JSONB NOT NULL,
  pickups JSONB NOT NULL DEFAULT '[]'::jsonb,
  destination JSONB NOT NULL,
  rate_per_km NUMERIC NOT NULL DEFAULT 0,
  legs_km NUMERIC[] NOT NULL DEFAULT '{}',
  distance_pickup_km NUMERIC NOT NULL DEFAULT 0,
  distance_trip_km NUMERIC NOT NULL DEFAULT 0,
  total_km NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled',
  current_pickup_index INT,
  notes TEXT,
  driver_rating INT,
  passenger_rating INT,
  rating_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX rides_user_scheduled_idx ON public.rides(user_id, scheduled_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rides TO authenticated;
GRANT ALL ON public.rides TO service_role;

ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own rides"
  ON public.rides FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_settings (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rate_per_km NUMERIC NOT NULL DEFAULT 2.5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own settings"
  ON public.user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER rides_touch_updated_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER user_settings_touch_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
