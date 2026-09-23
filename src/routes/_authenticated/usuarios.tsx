import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, UserRoundCog, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/hooks/useSession";
import {
  createManagedUser,
  listManagedUsers,
  type ManagedUser,
} from "@/lib/user-management.functions";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Gestão de Usuários — CMG" },
      { name: "description", content: "Administração dos acessos da equipe CMG." },
      { property: "og:title", content: "Gestão de Usuários — CMG" },
      { property: "og:description", content: "Administração dos acessos da equipe CMG." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersPage,
});

const PASSWORD_RULE =
  "Mínimo de 10 caracteres, com maiúsculas, minúsculas, números e caracteres especiais.";

function UsersPage() {
  const session = useSession();
  const fetchUsers = useServerFn(listManagedUsers);
  const createUser = useServerFn(createManagedUser);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"analista" | "gestao">("analista");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await fetchUsers());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar os usuários");
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  useEffect(() => {
    if (session.role === "gestao") void load();
  }, [load, session.role]);

  if (session.loading) return null;
  if (!session.userId) throw redirect({ to: "/" });
  if (session.role !== "gestao") throw redirect({ to: "/atividades" });

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    try {
      await createUser({
        data: {
          fullName: String(values.get("fullName") ?? ""),
          companyId: String(values.get("companyId") ?? ""),
          birthDate: String(values.get("birthDate") ?? ""),
          password: String(values.get("password") ?? ""),
          role,
        },
      });
      toast.success("Usuário criado com sucesso");
      form.reset();
      setRole("analista");
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o usuário");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      session={session}
      title="Gestão de usuários"
      subtitle="Consulte os acessos da equipe e cadastre novos usuários."
    >
      <div className="mb-5 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4" /> Novo usuário</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Novo usuário</DialogTitle>
              <DialogDescription>Crie o acesso inicial e defina o cargo do colaborador.</DialogDescription>
            </DialogHeader>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="user-name">Nome completo</Label>
                <Input id="user-name" name="fullName" maxLength={120} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="user-company-id">ID da Empresa</Label>
                <Input id="user-company-id" name="companyId" maxLength={40} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="user-birth-date">Data de nascimento</Label>
                <Input id="user-birth-date" name="birthDate" type="date" required />
              </div>
              <div className="grid gap-2">
                <Label>Cargo</Label>
                <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="analista">Analista</SelectItem>
                    <SelectItem value="gestao">Gestão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="user-password">Senha inicial</Label>
                <Input id="user-password" name="password" type="password" autoComplete="new-password" required />
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">{PASSWORD_RULE}</p>
              <div className="flex justify-end sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <UserRoundCog className="size-4" />}
                  Criar usuário
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <section className="panel overflow-hidden">
        {loading ? (
          <div className="grid min-h-56 place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : users.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Nome</TableHead>
                <TableHead>ID da Empresa</TableHead>
                <TableHead>Data de Nascimento</TableHead>
                <TableHead className="pr-5">Cargo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="pl-5 font-medium">{user.fullName}</TableCell>
                  <TableCell>{user.companyId}</TableCell>
                  <TableCell>{formatBirthDate(user.birthDate)}</TableCell>
                  <TableCell className="pr-5">
                    <Badge variant={user.role === "gestao" ? "default" : "secondary"}>
                      {user.role === "gestao" ? "Gestão" : "Analista"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="grid min-h-56 place-items-center p-8 text-center">
            <div><UsersRound className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">Nenhum usuário encontrado.</p></div>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function formatBirthDate(value: string | null) {
  if (!value) return "Não informada";
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}