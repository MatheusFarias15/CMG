import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  company_id: string;
  full_name: string;
  birth_date: string | null;
};

export type SessionState = {
  loading: boolean;
  userId: string | null;
  profile: Profile | null;
  role: "gestao" | "analista" | null;
};

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    loading: true,
    userId: null,
    profile: null,
    role: null,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!active) return;
      if (!user) {
        setState({ loading: false, userId: null, profile: null, role: null });
        return;
      }
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, company_id, full_name, birth_date")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (!active) return;
      setState({
        loading: false,
        userId: user.id,
        profile: (profile as Profile) ?? null,
        role: (roles?.[0]?.role as SessionState["role"]) ?? "analista",
      });
    };

    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void load();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
