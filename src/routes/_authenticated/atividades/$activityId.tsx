import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Camera, CheckCircle2, FileDown, ImagePlus, Loader2, MapPin, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { AREAS, FORM_FIELDS, PHOTO_MAX_BYTES, PHOTO_TYPES, TYPES, formatDate, type Activity, type ActivityPhoto } from "@/lib/cmg";
import { buildActivityReport, type ReportPhoto } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/atividades/$activityId")({
  head: () => ({
    meta: [
      { title: "Execução de atividade — CMG" },
      { name: "description", content: "Registro técnico de execução em campo da Torre Meridian." },
      { property: "og:title", content: "Execução de atividade — CMG" },
      { property: "og:description", content: "Registro técnico e evidências fotográficas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivityDetailPage,
});

function ActivityDetailPage() {
  const { activityId } = Route.useParams();
  const session = useSession();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [photos, setPhotos] = useState<ActivityPhoto[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: row }, { data: photoRows }] = await Promise.all([
      supabase.from("activities").select("*").eq("id", activityId).maybeSingle(),
      supabase.from("activity_photos").select("*").eq("activity_id", activityId).order("created_at"),
    ]);
    const nextActivity = row as Activity | null;
    setActivity(nextActivity);
    setFormData(nextActivity?.form_data ?? {});
    const nextPhotos = (photoRows as ActivityPhoto[]) ?? [];
    setPhotos(nextPhotos);
    const paths = nextPhotos.map((photo) => photo.storage_path);
    if (paths.length) {
      const { data } = await supabase.storage.from("activity-photos").createSignedUrls(paths, 3600);
      const urls: Record<string, string> = {};
      data?.forEach((item, index) => { if (item.signedUrl && paths[index]) urls[paths[index]] = item.signedUrl; });
      setSignedUrls(urls);
    }
  }, [activityId]);

  useEffect(() => {
    void load();
    const channel = supabase.channel(`activity-${activityId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "activities", filter: `id=eq.${activityId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_photos", filter: `activity_id=eq.${activityId}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [activityId, load]);

  if (session.loading) return null;
  if (!session.userId) throw redirect({ to: "/" });
  if (!activity) return <AppShell session={session} title="Atividade não encontrada"><div className="panel p-8 text-center">Este registro não está disponível para o seu perfil.</div></AppShell>;

  const readonly = activity.status === "concluida";

  const save = async (complete = false) => {
    if (complete) {
      const missing = FORM_FIELDS[activity.activity_type].find((field) => !formData[field.key]?.trim());
      if (missing) { toast.error(`Preencha o campo: ${missing.label}`); return; }
    }
    setBusy(true);
    const { error } = await supabase.from("activities").update({
      form_data: formData,
      ...(complete ? { status: "concluida" as const, completed_at: new Date().toISOString() } : {}),
    }).eq("id", activity.id);
    setBusy(false);
    if (error) { toast.error("Não foi possível salvar a atividade"); return; }
    toast.success(complete ? "Atividade concluída e relatório liberado" : "Registro salvo");
    await load();
  };



  const removePhoto = async (photo: ActivityPhoto) => {
    const { error } = await supabase.from("activity_photos").delete().eq("id", photo.id);
    if (error) { toast.error("Não foi possível excluir a foto"); return; }
    await supabase.storage.from("activity-photos").remove([photo.storage_path]);
    await load();
  };

  const report = async () => {
    if (activity.status !== "concluida") return;
    setBusy(true);
    const reportPhotos: ReportPhoto[] = [];
    for (const photo of photos) {
      const { data } = await supabase.storage.from("activity-photos").download(photo.storage_path);
      if (!data) continue;
      const dataUrl = await blobToDataUrl(data);
      reportPhotos.push({ caption: photo.caption, dataUrl, format: data.type === "image/png" ? "PNG" : "JPEG" });
    }
    const { data: analyst } = await supabase.from("profiles").select("full_name").eq("id", activity.assigned_to).maybeSingle();
    const doc = await buildActivityReport(activity, analyst?.full_name ?? session.profile?.full_name ?? "Analista", reportPhotos);
    doc.save(`CMG-${activity.title.replace(/[^a-z0-9]+/gi, "-")}.pdf`);
    setBusy(false);
  };

  return (
    <AppShell session={session} title={activity.title} subtitle={`${TYPES[activity.activity_type]} · ${AREAS[activity.area]}`}>
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={readonly ? "secondary" : "default"}>{readonly ? "Concluída" : "Em andamento"}</Badge>
        <span className="text-muted-foreground">Programada para {formatDate(activity.scheduled_date)}</span>
        {activity.location ? <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="size-3.5" /> {activity.location}</span> : null}
      </div>

      {activity.description ? <section className="panel mb-5 p-5"><h2 className="font-semibold">Escopo delegado</h2><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{activity.description}</p></section> : null}

      <section className="panel p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Registro de execução</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {FORM_FIELDS[activity.activity_type].map((field) => (
            <div key={field.key} className={`grid gap-2 ${field.long ? "sm:col-span-2" : ""}`}>
              <Label htmlFor={field.key}>{field.label}</Label>
              {field.long ? (
                <Textarea id={field.key} rows={4} maxLength={3000} value={formData[field.key] ?? ""} disabled={readonly} onChange={(event) => setFormData((current) => ({ ...current, [field.key]: event.target.value }))} />
              ) : (
                <Input id={field.key} maxLength={200} value={formData[field.key] ?? ""} disabled={readonly} onChange={(event) => setFormData((current) => ({ ...current, [field.key]: event.target.value }))} />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="panel mt-5 p-5 sm:p-7">
        <div className="flex items-center gap-3"><Camera className="size-5 text-primary" /><div><h2 className="text-lg font-semibold">Evidências fotográficas</h2><p className="text-sm text-muted-foreground">JPEG ou PNG · até 50 MB por arquivo</p></div></div>
        {!readonly ? (
          <div className="mt-5 grid gap-3 rounded-md border border-dashed p-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="grid gap-2"><Label htmlFor="photo-caption">Legenda da próxima foto</Label><Input id="photo-caption" placeholder="Ex.: Condição encontrada no Lado A" onChange={(event) => setCaptions((current) => ({ ...current, pending: event.target.value }))} /></div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline"><label><Camera className="size-4" /> Câmera<input className="sr-only" type="file" accept="image/jpeg,image/png" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setCaptions((current) => ({ ...current, [file.name]: current["pending"] ?? "" })); void uploadWithCaption(file, captions["pending"] ?? "", activity.id, session.userId ?? "", load, setBusy); } }} /></label></Button>
              <Button asChild variant="outline"><label><ImagePlus className="size-4" /> Galeria<input className="sr-only" type="file" accept="image/jpeg,image/png" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setCaptions((current) => ({ ...current, [file.name]: current["pending"] ?? "" })); void uploadWithCaption(file, captions["pending"] ?? "", activity.id, session.userId ?? "", load, setBusy); } }} /></label></Button>
            </div>
          </div>
        ) : null}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => <figure key={photo.id} className="overflow-hidden rounded-md border bg-muted"><img src={signedUrls[photo.storage_path]} alt={photo.caption || "Evidência da atividade"} className="aspect-[4/3] w-full object-cover" /><figcaption className="flex items-start justify-between gap-2 p-3 text-sm"><span>{photo.caption || "Sem legenda"}</span>{!readonly ? <Button size="icon" variant="ghost" onClick={() => void removePhoto(photo)} aria-label="Excluir foto"><Trash2 className="size-4 text-destructive" /></Button> : null}</figcaption></figure>)}
        </div>
      </section>

      <div className="sticky bottom-0 mt-6 flex flex-wrap justify-end gap-2 border-t bg-background/95 py-4 backdrop-blur">
        {!readonly ? <><Button variant="outline" onClick={() => void save(false)} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar</Button><Button onClick={() => void save(true)} disabled={busy}><CheckCircle2 className="size-4" /> Concluir atividade</Button></> : <Button onClick={() => void report()} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />} Gerar relatório PDF</Button>}
      </div>
    </AppShell>
  );
}

async function uploadWithCaption(file: File, caption: string, activityId: string, userId: string, reload: () => Promise<void>, setBusy: (value: boolean) => void) {
  if (!PHOTO_TYPES.includes(file.type)) { toast.error("Envie somente imagens JPEG ou PNG"); return; }
  if (file.size > PHOTO_MAX_BYTES) { toast.error("A imagem deve ter no máximo 50 MB"); return; }
  const extension = file.type === "image/png" ? "png" : "jpg";
  const path = `${activityId}/${crypto.randomUUID()}.${extension}`;
  setBusy(true);
  const { error: uploadError } = await supabase.storage.from("activity-photos").upload(path, file, { contentType: file.type });
  if (uploadError) { setBusy(false); toast.error("Não foi possível enviar a foto"); return; }
  const { error } = await supabase.from("activity_photos").insert({ activity_id: activityId, storage_path: path, caption: caption.trim() || null, uploaded_by: userId });
  setBusy(false);
  if (error) { await supabase.storage.from("activity-photos").remove([path]); toast.error("Não foi possível registrar a foto"); return; }
  toast.success("Foto anexada");
  await reload();
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
}
