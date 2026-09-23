import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { emailForCompanyId } from "@/lib/auth.functions";

const passwordSchema = z
  .string()
  .min(10, "A senha deve ter no mínimo 10 caracteres")
  .regex(/[A-Z]/, "A senha deve conter letra maiúscula")
  .regex(/[a-z]/, "A senha deve conter letra minúscula")
  .regex(/[0-9]/, "A senha deve conter número")
  .regex(/[^A-Za-z0-9]/, "A senha deve conter caractere especial");

const companyIdSchema = z
  .string()
  .trim()
  .min(3, "Informe o ID da empresa")
  .max(40)
  .regex(/^[A-Za-z0-9._-]+$/, "Use apenas letras, números, ponto, hífen ou underline");

export type ManagedUser = {
  id: string;
  fullName: string;
  companyId: string;
  birthDate: string | null;
  role: "gestao" | "analista";
};

export const listManagedUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManagedUser[]> => {
    const { data: roleCheck, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "gestao")
      .maybeSingle();
    if (roleError || !roleCheck) throw new Error("Acesso restrito à Gestão");

    const [profilesResult, rolesResult] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, full_name, company_id, birth_date")
        .order("full_name"),
      context.supabase.from("user_roles").select("user_id, role"),
    ]);
    if (profilesResult.error || rolesResult.error) {
      throw new Error("Não foi possível carregar os usuários");
    }

    const roles = new Map(rolesResult.data.map((item) => [item.user_id, item.role]));
    return profilesResult.data.flatMap((profile) => {
      const role = roles.get(profile.id);
      if (!role) return [];
      return [{
        id: profile.id,
        fullName: profile.full_name,
        companyId: profile.company_id,
        birthDate: profile.birth_date,
        role,
      }];
    });
  });

export const createManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      fullName: z.string().trim().min(3, "Informe o nome completo").max(120),
      companyId: companyIdSchema,
      birthDate: z.string().date("Informe uma data de nascimento válida"),
      role: z.enum(["analista", "gestao"]),
      password: passwordSchema,
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: roleCheck, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "gestao")
      .maybeSingle();
    if (roleError || !roleCheck) throw new Error("Acesso restrito à Gestão");

    const companyId = data.companyId.toLowerCase();
    const { data: existing } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("company_id", companyId)
      .maybeSingle();
    if (existing) throw new Error("Este ID da empresa já está cadastrado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailForCompanyId(companyId),
      password: data.password,
      email_confirm: true,
      user_metadata: { company_id: companyId, full_name: data.fullName },
    });
    if (authError || !created.user) {
      throw new Error(authError?.message ?? "Não foi possível criar a conta");
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      company_id: companyId,
      full_name: data.fullName,
      birth_date: data.birthDate,
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(profileError.message);
    }

    const { error: roleInsertError } = await supabaseAdmin.from("user_roles").insert({
      user_id: created.user.id,
      role: data.role,
    });
    if (roleInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(roleInsertError.message);
    }
    return { id: created.user.id };
  });