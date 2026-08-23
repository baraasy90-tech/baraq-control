import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { getFileUrls } from "@/lib/supabase/storage";
import {
  mapInternalRequestAttachment,
  mapInternalRequestAttachmentRevision,
} from "@/features/requests/api/mapInternalRequest";
import type { InternalRequestAttachment, InternalRequestAttachmentRevision } from "@/types/domain";

export interface InternalRequestAttachmentBundle {
  attachment: InternalRequestAttachment;
  revisions: InternalRequestAttachmentRevision[];
}

/** كل مرفقات طلب داخلي، كل واحد مع سجل نسخه (revisions) الكامل مرتّباً زمنياً. fileUrl
 * المخزَّن بكل نسخة مسار فقط (bucket "documents" قصير الأجل) — يُستبدل هنا برابط موقّت
 * صالح للعرض الفعلي فقط، بنفس أسلوب useInternalRequests/useMaterialAttachments. */
export function useRequestAttachments(requestId: string | undefined) {
  return useQuery({
    queryKey: ["internal-request-attachments", requestId],
    enabled: !!requestId,
    queryFn: async (): Promise<InternalRequestAttachmentBundle[]> => {
      const { data: attachmentRows, error } = await supabase
        .from("internal_request_attachments")
        .select("*")
        .eq("request_id", requestId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (attachmentRows.length === 0) return [];

      const attachmentIds = attachmentRows.map((a) => a.id);
      const { data: revisionRows, error: revisionsError } = await supabase
        .from("internal_request_attachment_revisions")
        .select("*")
        .in("attachment_id", attachmentIds)
        .order("revision_number", { ascending: true });
      if (revisionsError) throw revisionsError;

      const urlByStored = await getFileUrls("documents", revisionRows.map((r) => r.file_url));
      const revisions = revisionRows.map(mapInternalRequestAttachmentRevision).map((revision) => ({
        ...revision,
        fileUrl: urlByStored.get(revision.fileUrl) ?? revision.fileUrl,
      }));

      return attachmentRows.map(mapInternalRequestAttachment).map((attachment) => ({
        attachment,
        revisions: revisions.filter((r) => r.attachmentId === attachment.id),
      }));
    },
  });
}

export function useAddRequestAttachment(requestId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileName, fileUrl }: { fileName: string; fileUrl: string }) => {
      const { error } = await supabase.rpc("add_internal_request_attachment", {
        p_request_id: requestId!,
        p_file_name: fileName,
        p_file_url: fileUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (requestId) queryClient.invalidateQueries({ queryKey: ["internal-request-attachments", requestId] });
    },
  });
}

export function useAddRequestAttachmentRevision(requestId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attachmentId, fileUrl, note }: { attachmentId: string; fileUrl: string; note: string | null }) => {
      const { error } = await supabase.rpc("add_internal_request_attachment_revision", {
        p_attachment_id: attachmentId,
        p_file_url: fileUrl,
        p_note: note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (requestId) queryClient.invalidateQueries({ queryKey: ["internal-request-attachments", requestId] });
    },
  });
}
