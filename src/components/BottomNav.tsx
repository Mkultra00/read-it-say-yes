import { NavLink as RouterNavLink, useNavigate } from "react-router-dom";
import { Home, BookOpen, Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNarrationStore } from "@/hooks/useNarrationStore";

const links = [
  { to: "/", label: "Home", icon: Home },
  { to: "/stories", label: "Stories", icon: BookOpen },
  { to: "/voice", label: "Voice", icon: Mic },
];

export function BottomNav() {
  const navigate = useNavigate();
  const isActive = useNarrationStore((s) => s.isActive);
  const stop = useNarrationStore((s) => s.stop);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {links.map(({ to, label, icon: Icon }) => {
          // Home button doubles as a stop button while narration is active
          if (to === "/" && isActive) {
            return (
              <button
                key={to}
                type="button"
                onClick={() => {
                  stop();
                  navigate("/");
                }}
                className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors rounded-lg"
                aria-label="Stop narration and go home"
              >
                <Square className="h-5 w-5 fill-current" />
                <span>Stop</span>
              </button>
            );
          }
          return (
            <RouterNavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive: navActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-4 py-1.5 text-xs font-medium transition-colors rounded-lg",
                  navActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </RouterNavLink>
          );
        })}
      </div>
    </nav>
  );
}
