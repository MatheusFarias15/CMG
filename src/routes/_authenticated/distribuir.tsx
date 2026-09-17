import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession, type Profile } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { AREAS, TYPES } from "@/lib/cmg";

export const Route = createFileRoute("/_authenticated/distribuir")({
  head: () => ({
    meta: [
      { title: "Distribuir atividades — CMG" },
      { name: "description", content: "Criação e distribuição de atividades para a equipe de facilities." },
      { property: "og:title", content: "Distribuir atividades — CMG" },
      { property: "og:description", content: "Gestão operacional da Torre Meridian." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssignPage,
});

function AssignPage() {
  const session = useSession();
  const [analysts, setAnalysts] = useState<Profile[]>([]);
  const [busy, setBusy] = useState(false);
  const [area, setArea] = useState<keyof typeof AREAS>("climatizacao");
  const [type, setType] = useState<keyof typeof TYPES>("ronda_pavimentos");
  const [assignedTo, setAssignedTo] = useState("");

  useEffect(() => {
    if (session.role !== "gestao") return;
    void Promise.all([
      supabase.from("user_roles").select("user_id").eq("role", "analista"),
      supabase.from("profiles").select("id, company_id, full_name, birth_date").order("full_name"),
    ]).then(([roles, profiles]) => {
      const ids = new Set(roles.data?.map((row) => row.user_id));
      setAnalysts(((profiles.data as Profile[]) ?? []).filter((profile) => ids.has(profile.id)));
    });
  }, [session.role]);

  if (session.loading) return null;
  if (!session.userId) throw redirect({ to: "/" });
  if (session.role !== "gestao") throw redirect({ to: "/atividades" });

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assignedTo) { toast.error("Selecione um analista"); return; }
    const form = new FormData(event.currentTarget);
    setBusy(true);
    const { error } = await supabase.from("activities").insert({
      title: String(form.get("title") ?? "").trim(),
      area,
      activity_type: type,
      location: String(form.get("location") ?? "").trim() || null,
      description: String(form.get("description") ?? "").trim() || null,
      scheduled_date: String(form.get("scheduledDate") ?? ""),
      assigned_to: assignedTo,
      created_by: session.userId,
    });
    setBusy(false);
    if (error) { toast.error("Não foi possível distribuir a atividade"); return; }
    toast.success("Atividade distribuída ao analista");
    event.currentTarget.reset();
    setAssignedTo("");
  };

  return (
    <AppShell session={session} title="Distribuir atividade" subtitle="Defina o escopo e atribua a execução a um analista específico.">
      <form onSubmit={submit} className="panel mx-auto grid max-w-3xl gap-5 p-5 sm:grid-cols-2 sm:p-7">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="title">Título da atividade</Label>
          <Input id="title" name="title" maxLength={150} required placeholder="Ex.: Ronda técnica — 12º pavimento" />
        </div>
        <div className="grid gap-2">
          <Label>Área de atuação</Label>
          <Select value={area} onValueChange={(value) => setArea(value as keyof typeof AREAS)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(AREAS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Tipo de execução</Label>
          <Select value={type} onValueChange={(value) => setType(value as keyof typeof TYPES)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(TYPES).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="scheduledDate">Data programada</Label>
          <Input id="scheduledDate" name="scheduledDate" type="date" required />
        </div>
        <div className="grid gap-2">
          <Label>Analista responsável</Label>
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger><SelectValue placeholder="Selecionar analista" /></SelectTrigger>
            <SelectContent>
              {analysts.map((analyst) => <SelectItem key={analyst.id} value={analyst.id}>{analyst.full_name} · {analyst.company_id}</SelectItem>)}
            </SelectContent>
          </Select>
          {!analysts.length ? <p className="text-xs text-muted-foreground">Nenhum analista cadastrado ainda.</p> : null}
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="location">Local / pavimento / equipamento</Label>
          <Input id="location" name="location" maxLength={150} />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="description">Instruções e escopo</Label>
          <Textarea id="description" name="description" maxLength={2000} rows={5} />
        </div>
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" disabled={busy || !analysts.length}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Distribuir atividade
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
