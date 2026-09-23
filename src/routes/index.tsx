import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { emailForCompanyId, recoverPassword } from "@/lib/auth.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Acesso — CMG Torre Meridian" },
      {
        name: "description",
        content:
          "Entre com seu ID da empresa para registrar rondas, ajustes e preventivas do contrato Torre Meridian.",
      },
      { property: "og:title", content: "Acesso — CMG Torre Meridian" },
      {
        property: "og:description",
        content: "Central de Monitoramento & Gestão de Facilities.",
      },
    ],
  }),
  component: AuthPage,
});

const PASSWORD_RULE =
  "Mínimo de 10 caracteres, com maiúsculas, minúsculas, números e caracteres especiais.";

function validatePassword(password: string) {
  return (
    password.length >= 10 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const recover = useServerFn(recoverPassword);
  const [busy, setBusy] = useState(false);

  const goToApp = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const role = roles?.[0]?.role ?? "analista";
    await navigate({ to: role === "gestao" ? "/painel" : "/atividades" });
  };

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void goToApp();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const companyId = String(form.get("companyId") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!companyId || !password) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailForCompanyId(companyId),
      password,
    });
    setBusy(false);
    if (error) {
      toast.error("ID da empresa ou senha inválidos");
      return;
    }
    await goToApp();
  };

  const handleRecover = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (!validatePassword(password)) {
      toast.error(PASSWORD_RULE);
      return;
    }
    setBusy(true);
    try {
      await recover({
        data: {
          companyId: String(form.get("companyId") ?? ""),
          fullName: String(form.get("fullName") ?? ""),
          birthDate: String(form.get("birthDate") ?? ""),
          password,
        },
      });
      toast.success("Senha redefinida. Faça o login.");
      (event.target as HTMLFormElement).reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível redefinir");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[1.1fr_1fr]">
      <section className="institutional-bar flex flex-col justify-between gap-10 px-6 py-10 text-surface-foreground sm:px-12 lg:py-16">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-md bg-accent font-display text-lg font-bold text-accent-foreground">
            CMG
          </span>
          <div className="text-sm/tight">
            <p className="font-semibold">Central de Monitoramento &amp; Gestão</p>
            <p className="opacity-70">Contrato Torre Meridian · São Paulo/SP</p>
          </div>
        </div>

        <div className="max-w-xl">
          <h1 className="text-3xl font-semibold sm:text-4xl">
            A execução de campo alimenta a gestão em tempo real.
          </h1>
          <p className="mt-4 text-sm opacity-80 sm:text-base">
            Rondas de pavimento, ajustes de VAG e manutenções preventivas registradas no celular,
            com evidências fotográficas, relatório técnico e indicadores do contrato — sem
            planilhas e sem digitação duplicada.
          </p>
          <ul className="mt-8 grid gap-3 text-sm opacity-90">
            {[
              "Atividades delegadas por analista, com status ao vivo",
              "Fotos com legenda direto da câmera ou galeria",
              "Relatório técnico em padrão institucional",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs opacity-60">Uso interno · Requisitos v1.0</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="panel w-full max-w-md p-5 sm:p-7">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="recover">Recuperar</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <h2 className="text-xl font-semibold">Acessar a plataforma</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use o ID da empresa e a sua senha.
              </p>
              <form className="mt-6 grid gap-4" onSubmit={handleLogin}>
                <div className="grid gap-2">
                  <Label htmlFor="login-id">ID da empresa</Label>
                  <Input id="login-id" name="companyId" autoComplete="username" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </div>
                <Button type="submit" disabled={busy} className="mt-2">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="recover" className="mt-6">
              <h2 className="text-xl font-semibold">Recuperar senha</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Confirme os dados do seu cadastro para definir uma nova senha.
              </p>
              <form className="mt-6 grid gap-4" onSubmit={handleRecover}>
                <div className="grid gap-2">
                  <Label htmlFor="rec-id">ID da empresa</Label>
                  <Input id="rec-id" name="companyId" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rec-name">Nome completo</Label>
                  <Input id="rec-name" name="fullName" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rec-birth">Data de nascimento</Label>
                  <Input id="rec-birth" name="birthDate" type="date" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rec-password">Nova senha</Label>
                  <Input id="rec-password" name="password" type="password" required />
                  <p className="text-xs text-muted-foreground">{PASSWORD_RULE}</p>
                </div>
                <Button type="submit" disabled={busy} variant="secondary">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Redefinir senha
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
}
