import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { SessionState } from "@/hooks/useSession";

type NavItem = { to: "/painel" | "/distribuir" | "/atividades"; label: string };

const NAV: Record<"gestao" | "analista", NavItem[]> = {
  gestao: [
    { to: "/painel", label: "Dashboard" },
    { to: "/distribuir", label: "Distribuir atividades" },
    { to: "/atividades", label: "Minhas atividades" },
  ],
  analista: [{ to: "/atividades", label: "Atividades delegadas" }],
};

export function AppShell({
  session,
  title,
  subtitle,
  children,
}: {
  session: SessionState;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const items = NAV[session.role ?? "analista"];

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="institutional-bar text-surface-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <span className="grid size-9 place-items-center rounded-md bg-accent font-display text-sm font-bold text-accent-foreground">
            CMG
          </span>
          <div className="mr-auto text-xs/tight sm:text-sm/tight">
            <p className="font-semibold">Central de Monitoramento &amp; Gestão</p>
            <p className="opacity-70">Torre Meridian</p>
          </div>
          <div className="hidden items-center gap-1 md:flex">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-2 text-sm opacity-80 transition-colors hover:bg-sidebar-accent hover:opacity-100"
                activeProps={{ className: "bg-sidebar-accent opacity-100" }}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="hidden text-right text-xs md:block">
            <p className="font-medium">{session.profile?.full_name ?? "—"}</p>
            <p className="opacity-70">
              {session.role === "gestao" ? "Gestão" : "Analista"} · {session.profile?.company_id}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={signOut} className="hidden md:inline-flex">
            <LogOut className="size-4" /> Sair
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Abrir menu"
          >
            <Menu className="size-4" />
          </Button>
        </div>
        {open ? (
          <div className="border-t border-sidebar-border px-4 pb-4 md:hidden">
            <div className="grid gap-1 py-2">
              {items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm opacity-90 hover:bg-sidebar-accent"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <p className="px-3 pb-2 text-xs opacity-70">
              {session.profile?.full_name} · {session.role === "gestao" ? "Gestão" : "Analista"}
            </p>
            <Button size="sm" variant="secondary" onClick={signOut} className="w-full">
              <LogOut className="size-4" /> Sair
            </Button>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
