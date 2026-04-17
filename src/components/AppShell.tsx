import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 gradient-hero" aria-hidden />
      <main className="relative flex-1 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
