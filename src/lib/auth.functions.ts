import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

export const emailForCompanyId = (companyId: string) =>
  `${companyId.trim().toLowerCase()}@cmg.local`;

const MASTER_ID = "admin01";
const MASTER_PASSWORD = "Master@Cmg2026!";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Cria (uma única vez) o usuário master de Gestão. Idempotente. */
export const ensureMasterUser = createServerFn({ method: "POST" }).handler(async () => {
  const db = await admin();
  const { data: existing } = await db
    .from("profiles")
    .select("id")
    .eq("company_id", MASTER_ID)
    .maybeSingle();
  if (existing) return { created: false };

  const { data, error } = await db.auth.admin.createUser({
    email: emailForCompanyId(MASTER_ID),
    password: MASTER_PASSWORD,
    email_confirm: true,
    user_metadata: { company_id: MASTER_ID, full_name: "Gestão CMG" },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Falha ao criar usuário master");

  await db.from("profiles").insert({
    id: data.user.id,
    company_id: MASTER_ID,
    full_name: "Gestão CMG",
  });
  await db.from("user_roles").insert({ user_id: data.user.id, role: "gestao" });
  return { created: true };
});

export const signUpAnalyst = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(3, "Informe o nome completo").max(120),
        birthDate: z.string().min(10, "Informe a data de nascimento"),
        companyId: companyIdSchema,
        password: passwordSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const companyId = data.companyId.trim().toLowerCase();

    const { data: taken } = await db
      .from("profiles")
      .select("id")
      .eq("company_id", companyId)
      .maybeSingle();
    if (taken) throw new Error("Este ID da empresa já está cadastrado");

    const { data: created, error } = await db.auth.admin.createUser({
      email: emailForCompanyId(companyId),
      password: data.password,
      email_confirm: true,
      user_metadata: { company_id: companyId, full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar cadastro");

    const { error: profileError } = await db.from("profiles").insert({
      id: created.user.id,
      company_id: companyId,
      full_name: data.fullName.trim(),
      birth_date: data.birthDate,
    });
    if (profileError) {
      await db.auth.admin.deleteUser(created.user.id);
      throw new Error(profileError.message);
    }
    await db.from("user_roles").insert({ user_id: created.user.id, role: "analista" });
    return { companyId };
  });

/** Recuperação de senha: confere nome e data de nascimento do cadastro. */
export const recoverPassword = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        companyId: companyIdSchema,
        fullName: z.string().trim().min(3),
        birthDate: z.string().min(10),
        password: passwordSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const companyId = data.companyId.trim().toLowerCase();
    const { data: profile } = await db
      .from("profiles")
      .select("id, full_name, birth_date")
      .eq("company_id", companyId)
      .maybeSingle();

    const normalize = (value: string) =>
      value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (
      !profile ||
      !profile.birth_date ||
      normalize(profile.full_name) !== normalize(data.fullName) ||
      profile.birth_date !== data.birthDate
    ) {
      throw new Error("Dados não conferem com o cadastro. Procure a Gestão do contrato.");
    }

    const { error } = await db.auth.admin.updateUserById(profile.id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
