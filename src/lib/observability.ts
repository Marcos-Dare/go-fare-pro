import posthog from "posthog-js";
import * as Sentry from "@sentry/react";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://us.i.posthog.com";
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const SENTRY_ENV = (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) ?? import.meta.env.MODE;
const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "dev";

let posthogReady = false;
let sentryReady = false;

export function initObservability() {
  if (POSTHOG_KEY && !posthogReady) {
    try {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: true,
        capture_pageleave: true,
        person_profiles: "identified_only",
        // Mostra o comportamento do PostHog no console em modo de desenvolvimento
        loaded: (ph) => {
          if (import.meta.env.DEV) ph.debug();
        },
        // Captura console.error e logs de erro automaticamente para o Error Tracking e Session Replay
        enable_recording_console_log: true,
      });
      posthogReady = true;
    } catch (e) {
      console.warn("[observability] PostHog init failed", e);
    }
  } else if (!POSTHOG_KEY) {
    console.info("[observability] PostHog disabled (VITE_POSTHOG_KEY ausente)");
  }

  if (SENTRY_DSN && !sentryReady) {
    try {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: SENTRY_ENV,
        release: APP_VERSION,
        tracesSampleRate: 0.2,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1.0,
      });
      sentryReady = true;
    } catch (e) {
      console.warn("[observability] Sentry init failed", e);
    }
  } else if (!SENTRY_DSN) {
    console.info("[observability] Sentry disabled (VITE_SENTRY_DSN ausente)");
  }
}

/** Catálogo de eventos de negócio rastreados. */
export const Events = {
  Login: "user_login",
  RideCompleted: "ride_completed",
  RideCancelled: "ride_cancelled",
  DriverRated: "driver_rated",
  PassengerRated: "passenger_rated",
} as const;

export type EventName = (typeof Events)[keyof typeof Events] | string;

export function track(event: EventName, properties?: Record<string, unknown>) {
  if (posthogReady) {
    try {
      posthog.capture(event, properties);
    } catch (e) {
      console.warn("[observability] capture failed", e);
    }
  }
  if (sentryReady) {
    Sentry.addBreadcrumb({
      category: "analytics",
      message: String(event),
      level: "info",
      data: properties,
    });
  }
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (posthogReady) {
    try {
      posthog.identify(userId, traits);
    } catch (e) {
      console.warn("[observability] identify failed", e);
    }
  }
  if (sentryReady) {
    Sentry.setUser({ id: userId, ...(traits as any) });
  }
}

export function resetUser() {
  if (posthogReady) posthog.reset();
  if (sentryReady) Sentry.setUser(null);
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (sentryReady) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } else {
    console.error("[observability] error", error, context);
    // Envia o erro manualmente para o Error Tracking do PostHog
    if (posthogReady) {
      posthog.captureException(error instanceof Error ? error : new Error(String(error)), { extra: context });
    }
  }
}

/** Helpers tipados para os eventos de negócio. */
export const analytics = {
  login: (userId: string, method: "email" | "google" | "apple" | "anonymous" = "anonymous") => {
    identifyUser(userId, { login_method: method });
    track(Events.Login, { method });
  },
  rideCompleted: (p: { rideId: string; totalKm: number; price: number; pickups: number }) =>
    track(Events.RideCompleted, p),
  rideCancelled: (p: { rideId: string; reason?: string; status: string }) =>
    track(Events.RideCancelled, p),
  driverRated: (p: { rideId: string; driverId?: string; rating: number; comment?: string }) =>
    track(Events.DriverRated, p),
  passengerRated: (p: { rideId: string; passengerName?: string; rating: number; comment?: string }) =>
    track(Events.PassengerRated, p),
};
