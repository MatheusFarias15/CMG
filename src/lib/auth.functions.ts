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

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

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
