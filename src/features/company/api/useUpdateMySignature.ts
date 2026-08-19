import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { uploadFile, uniqueFileName, dataUrlToBlob } from "@/lib/supabase/storage";

export function useUpdateMySignature() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (signatureDataUrl: string | null) => {
      if (!user) throw new Error("not authenticated");
      let signatureUrl: string | null = null;
      if (signatureDataUrl) {
        const blob = await dataUrlToBlob(signatureDataUrl);
        signatureUrl = await uploadFile("signatures", `${user.id}/${uniqueFileName("profile-signature.png")}`, blob);
      }
      const { error } = await supabase.from("profiles").update({ signature_url: signatureUrl }).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
