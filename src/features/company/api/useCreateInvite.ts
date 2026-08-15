import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import type { MemberRole } from "@/types/domain";

export interface CreateInviteInput {
  companyId: string;
  departmentId: string;
  role: MemberRole;
  email: string;
  companyName: string;
  departmentName: string;
  inviterName: string;
}

export interface CreateInviteResult {
  token: string;
  emailSent: boolean;
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateInviteInput): Promise<CreateInviteResult> => {
      if (!user) throw new Error("غير مسجّل دخول");
      const { data, error } = await supabase
        .from("invites")
        .insert({
          company_id: input.companyId,
          department_id: input.departmentId,
          role: input.role,
          email: input.email.trim().toLowerCase(),
          invited_by: user.id,
        })
        .select("token")
        .single();
      if (error) throw error;

      const joinLink = `${window.location.origin}/join/${data.token}`;
      let emailSent = false;
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke("send-invite-email", {
          body: {
            to: input.email.trim().toLowerCase(),
            companyName: input.companyName,
            departmentName: input.departmentName,
            inviterName: input.inviterName,
            role: input.role,
            joinLink,
          },
        });
        emailSent = !fnError && !fnData?.error;
      } catch {
        emailSent = false;
      }

      return { token: data.token, emailSent };
    },
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({ queryKey: ["invites", input.companyId] });
    },
  });
}
