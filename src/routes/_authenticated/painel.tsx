import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileDown, FileText, ListChecks, Timer, UserRoundCheck } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession, type Profile } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { STATUS, TYPES, type Activity } from "@/lib/cmg";
import { exportActivitiesPdf, exportActivitiesWord } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Dashboard de Gestão — CMG" },
      { name: "description", content: "Painel em tempo real das atividades da equipe da Torre Meridian." },
      { property: "og:title", content: "Dashboard de Gestão — CMG" },
      { property: "og:description", content: "Indicadores e desempenho da equipe de facilities." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const COLOR_CLASSES = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

type DashboardRow = Activity & { analyst: string };

function DashboardPage() {
  const session = useSession();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [day, setDay] = useState("");

  const load = useCallback(async () => {
    const [activityResult, profileResult] = await Promise.all([
      supabase.from("activities").select("*").order("scheduled_date", { ascending: false }),
      supabase.from("profiles").select("id, company_id, full_name, birth_date"),
    ]);
    setActivities((activityResult.data as Activity[]) ?? []);
    setProfiles((profileResult.data as Profile[]) ?? []);
  }, []);

  useEffect(() => {
    if (session.role !== "gestao") return;
    void load();
    const channel = supabase.channel("management-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, session.role]);

  const rows: DashboardRow[] = useMemo(() => {
    const names = new Map(profiles.map((profile) => [profile.id, profile.full_name]));
    return activities.map((activity) => ({ ...activity, analyst: names.get(activity.assigned_to) ?? "Analista" }));
  }, [activities, profiles]);
  const filtered = day ? rows.filter((row) => row.scheduled_date === day) : rows;
  const completed = rows.filter((row) => row.status === "concluida").length;
  const chartData = profiles
    .map((profile) => ({ name: profile.full_name, value: rows.filter((row) => row.assigned_to === profile.id).length }))
    .filter((item) => item.value > 0);
  const label = day ? `Filtro: ${new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR")}` : "Período: todas as datas";

  if (session.loading) return null;
  if (!session.userId) throw redirect({ to: "/" });
  if (session.role !== "gestao") throw redirect({ to: "/atividades" });

  return (
    <AppShell session={session} title="Dashboard da equipe" subtitle="Indicadores atualizados automaticamente pela execução em campo.">
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric icon={<ListChecks />} label="Total de atividades" value={rows.length} />
        <Metric icon={<Timer />} label="Em andamento" value={rows.length - completed} />
        <Metric icon={<UserRoundCheck />} label="Concluídas" value={completed} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.5fr]">
        <div className="panel p-5">
          <h2 className="text-lg font-semibold">Atividades por analista</h2>
          <p className="mt-1 text-sm text-muted-foreground">Distribuição do volume total delegado.</p>
          <div className="mt-4 h-72">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                    {chartData.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length] ?? "var(--chart-1)"} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="grid h-full place-items-center text-sm text-muted-foreground">Sem atividades para exibir.</div>}
          </div>
          <div className="grid gap-2">
            {chartData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="flex min-w-0 items-center gap-2"><span className={`size-2.5 shrink-0 rounded-full ${COLOR_CLASSES[index % COLOR_CLASSES.length]}`} /><span className="truncate">{item.name}</span></span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel min-w-0 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Exportação do painel</h2>
              <p className="mt-1 text-sm text-muted-foreground">Filtre por dia e gere o documento desejado.</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="filter-day">Dia</Label>
              <Input id="filter-day" type="date" value={day} onChange={(event) => setDay(event.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => exportActivitiesPdf(filtered, label)} disabled={!filtered.length}><FileDown className="size-4" /> Exportar PDF</Button>
            <Button variant="outline" onClick={() => exportActivitiesWord(filtered, label)} disabled={!filtered.length}><FileText className="size-4" /> Exportar Word</Button>
            {day ? <Button variant="ghost" onClick={() => setDay("")}>Limpar filtro</Button> : null}
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b text-xs text-muted-foreground"><tr><th className="py-3 pr-3">Atividade</th><th className="py-3 pr-3">Analista</th><th className="py-3 pr-3">Tipo</th><th className="py-3">Situação</th></tr></thead>
              <tbody>{filtered.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="py-3 pr-3 font-medium">{row.title}</td><td className="py-3 pr-3">{row.analyst}</td><td className="py-3 pr-3">{TYPES[row.activity_type]}</td><td className="py-3">{STATUS[row.status]}</td></tr>)}</tbody>
            </table>
            {!filtered.length ? <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma atividade no período selecionado.</p> : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="panel flex items-center gap-4 p-5"><div className="grid size-11 place-items-center rounded-md bg-secondary text-primary">{icon}</div><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value}</p></div></div>;
}
