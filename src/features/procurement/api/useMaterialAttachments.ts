import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { uploadFile, uniqueFileName, getFileUrls } from "@/lib/supabase/storage";
import type { MaterialRequestAttachment } from "@/types/domain";

function mapAttachment(row: {
  id: string;
  material_request_id: string;
  option_id: string | null;
  phase: "sample" | "purchase";
  file_url: string;
  file_name: string;
  uploaded_by: string | null;
  uploaded_at: string;
}): MaterialRequestAttachment {
  return {
    id: row.id,
    materialRequestId: row.material_request_id,
    optionId: row.option_id,
    phase: row.phase,
    fileUrl: row.file_url,
    fileName: row.file_name,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
  };
}

/** كل مرفقات الطلب (مرفقات الطلب نفسه + مرفقات كل الخيارات المرفقة من المشتريات).
 * fileUrl المخزّن بالجدول مسار فقط (bucket "documents" قصير الأجل) — يُستبدل هنا برابط
 * موقّت صالح للعرض الفعلي فقط، بنفس أسلوب useInternalRequests/useDocuments. */
export function useMaterialAttachments(requestId: string | undefined) {
  return useQuery({
    queryKey: ["material_request_attachments", requestId],
    enabled: !!requestId,
    queryFn: async (): Promise<MaterialRequestAttachment[]> => {
      const { data, error } = await supabase
        .from("material_request_attachments")
        .select("*")
        .eq("material_request_id", requestId!)
        .order("uploaded_at", { ascending: true });
      if (error) throw error;
      const urlByStored = await getFileUrls("documents", data.map((row) => row.file_url));
      return data.map((row) => {
        const attachment = mapAttachment(row);
        attachment.fileUrl = urlByStored.get(row.file_url) ?? row.file_url;
        return attachment;
      });
    },
  });
}

export function useUploadMaterialAttachment(requestId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      optionId,
      phase = "sample",
    }: {
      file: File;
      optionId: string | null;
      phase?: "sample" | "purchase";
    }) => {
      if (!user || !requestId) throw new Error("not authenticated");
      const fileUrl = await uploadFile("documents", `${user.id}/${uniqueFileName(file.name)}`, file);
      const { error } = await supabase.from("material_request_attachments").insert({
        material_request_id: requestId,
        option_id: optionId,
        phase,
        file_url: fileUrl,
        file_name: file.name,
        uploaded_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material_request_attachments", requestId] });
    },
  });
}

export function useDeleteMaterialAttachment(requestId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await supabase.from("material_request_attachments").delete().eq("id", attachmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material_request_attachments", requestId] });
    },
  });
}
