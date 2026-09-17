import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, Clock3, MapPin } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { AREAS, TYPES, formatDate, type Activity } from "@/lib/cmg";

export const Route = createFileRoute("/_authenticated/atividades")({
  head: () => ({
    meta: [
      { title: "Atividades delegadas — CMG" },
      { name: "description", content: "Atividades de campo delegadas ao analista na Torre Meridian." },
      { property: "og:title", content: "Atividades delegadas — CMG" },
      { property: "og:description", content: "Execução de rondas, ajustes e preventivas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const session = useSession();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("activities").select("*").order("scheduled_date", { ascending: false });
    setActivities((data as Activity[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("activities-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  if (session.loading) return <PageSkeleton />;
  if (!session.userId) throw redirect({ to: "/" });

  const current = activities.filter((item) => item.status === "em_andamento");
  const done = activities.filter((item) => item.status === "concluida");

  return (
    <AppShell
      session={session}
      title={session.role === "gestao" ? "Atividades da equipe" : "Atividades delegadas"}
      subtitle="Acompanhe as atividades em andamento e os registros já concluídos."
    >
      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Em andamento ({current.length})</TabsTrigger>
          <TabsTrigger value="done">Concluídas ({done.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="current" className="mt-5">
          <ActivityGrid rows={current} empty="Nenhuma atividade em andamento." />
        </TabsContent>
        <TabsContent value="done" className="mt-5">
          <ActivityGrid rows={done} empty="Nenhuma atividade concluída." />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function ActivityGrid({ rows, empty }: { rows: Activity[]; empty: string }) {
  if (!rows.length) {
    return (
      <div className="panel grid min-h-52 place-items-center p-8 text-center">
        <div>
          <ClipboardCheck className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">{empty}</p>
          <p className="mt-1 text-sm text-muted-foreground">As novas atividades aparecerão aqui automaticamente.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((activity) => (
        <Link
          key={activity.id}
          to="/atividades/$activityId"
          params={{ activityId: activity.id }}
          className="panel block p-5 transition-transform hover:-translate-y-0.5 hover:border-primary/40"
        >
          <div className="flex items-start justify-between gap-3">
            <Badge variant={activity.status === "concluida" ? "secondary" : "default"}>
              {TYPES[activity.activity_type]}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatDate(activity.scheduled_date)}</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold">{activity.title}</h2>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{activity.description || "Sem instruções adicionais."}</p>
          <div className="mt-5 grid gap-2 border-t pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2"><Clock3 className="size-3.5" /> {AREAS[activity.area]}</span>
            <span className="flex items-center gap-2"><MapPin className="size-3.5" /> {activity.location || "Local não informado"}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function PageSkeleton() {
  return <div className="mx-auto max-w-6xl p-6"><Skeleton className="h-12 w-64" /><Skeleton className="mt-8 h-72 w-full" /></div>;
}
