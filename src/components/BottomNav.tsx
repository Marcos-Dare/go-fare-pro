import { Link, useLocation } from "react-router-dom";
import { Calendar, Home, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Início", icon: Home },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
];

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/90 backdrop-blur-xl safe-bottom"
      aria-label="Navegação principal"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-xs font-medium transition-smooth",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5 transition-spring", active && "scale-110")} strokeWidth={active ? 2.4 : 2} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
