import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  PieChart,
  LineChart,
  FileText,
  CheckSquare,
  StickyNote,
  Users,
  Sun,
  Moon,
  ChevronDown,
  Shield,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import type { Practice } from "@shared/schema";

interface AppSidebarProps {
  practiceId: number;
  onPracticeChange: (id: number) => void;
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ppl", label: "Perfect P&L", icon: PieChart },
  { href: "/forecast", label: "Forecasting", icon: LineChart },
  { href: "/cfo-script", label: "CFO Script", icon: FileText },
  { href: "/actions", label: "Action Items", icon: CheckSquare },
  { href: "/notes", label: "Practice Notes", icon: StickyNote },
];

export function AppSidebar({ practiceId, onPracticeChange }: AppSidebarProps) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const { data: practices } = useQuery<Practice[]>({
    queryKey: ["/api/practices"],
  });

  const currentPractice = practices?.find((p) => p.id === practiceId);

  return (
    <aside className="flex flex-col h-full w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <QuartermasterLogo />
        <div>
          <p className="text-sm font-bold text-sidebar-foreground leading-tight">
            Quartermaster
          </p>
          <p className="text-xs text-sidebar-foreground/50 leading-tight">
            CFO Platform
          </p>
        </div>
      </div>

      {/* Practice Selector */}
      <div className="px-3 py-3 border-b border-sidebar-border">
        <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-medium px-2 mb-1">
          Practice
        </p>
        <div className="relative">
          <select
            className="w-full appearance-none bg-sidebar-accent text-sidebar-accent-foreground text-sm font-medium rounded-md px-3 py-2 pr-8 border border-sidebar-border focus:outline-none focus:ring-1 focus:ring-sidebar-ring cursor-pointer"
            value={practiceId}
            onChange={(e) => onPracticeChange(Number(e.target.value))}
            data-testid="select-practice"
          >
            {practices?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/50 pointer-events-none" />
        </div>
        {currentPractice && (
          <div className="flex items-center gap-1.5 px-2 mt-1.5">
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                currentPractice.planTier === "enterprise"
                  ? "bg-amber-400"
                  : currentPractice.planTier === "growth"
                  ? "bg-green-400"
                  : "bg-sky-400"
              )}
            />
            <span className="text-[10px] text-sidebar-foreground/50 capitalize">
              {currentPractice.planTier} plan
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3">
        <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-medium px-2 mb-1">
          Navigation
        </p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/" ? location === "/" : location.startsWith(href);
            return (
              <li key={href}>
                <Link href={href}>
                  <a
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                    data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                    {isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary-foreground/60" />
                    )}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Admin Section */}
        <div className="mt-4 pt-4 border-t border-sidebar-border">
          <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-medium px-2 mb-1">
            Admin
          </p>
          <ul className="space-y-0.5">
            <li>
              <Link href="/admin">
                <a
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    location === "/admin"
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  data-testid="nav-all-clients"
                >
                  <Users className="h-4 w-4 shrink-0" />
                  All Clients
                </a>
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Bottom bar */}
      <div className="px-3 py-3 border-t border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-full bg-sidebar-primary/20 flex items-center justify-center shrink-0">
            <Shield className="h-3.5 w-3.5 text-sidebar-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {currentPractice?.name ?? "Loading..."}
            </p>
            <p className="text-[10px] text-sidebar-foreground/40 truncate">
              {currentPractice?.email ?? ""}
            </p>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="shrink-0 p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          aria-label="Toggle theme"
          data-testid="button-toggle-theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}

function QuartermasterLogo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-label="Quartermaster logo"
      className="shrink-0"
    >
      <path
        d="M16 2L4 8v10c0 6.6 5.1 12 12 14 6.9-2 12-7.4 12-14V8L16 2z"
        className="fill-sidebar-primary"
      />
      <text
        x="16"
        y="22"
        fontFamily="var(--font-sans)"
        fontWeight="700"
        fontSize="14"
        fill="hsl(var(--sidebar-primary-foreground))"
        textAnchor="middle"
      >
        Q
      </text>
    </svg>
  );
}
