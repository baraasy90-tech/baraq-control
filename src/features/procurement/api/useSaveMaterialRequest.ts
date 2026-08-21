import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

export interface CreateMaterialRequestInput {
  projectId: string;
  itemName: string;
  description: string | null;
}

export function useCreateMaterialRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMaterialRequestInput) => {
      if (!user) throw new Error("not authenticated");
      const { data, error } = await supabase
        .from("material_requests")
        .insert({
          project_id: input.projectId,
          item_name: input.itemName,
          description: input.description,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id };
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["material_requests", input.projectId] });
    },
  });
}

export interface SaveSourcingDetailsInput {
  requestId: string;
  projectId: string;
  itemName: string;
  description: string | null;
  quantity: number | null;
  targetUnitPrice: number | null;
  neededBy: string | null;
}

export function useSaveSourcingDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveSourcingDetailsInput) => {
      const { error } = await supabase
        .from("material_requests")
        .update({
          item_name: input.itemName,
          description: input.description,
          quantity: input.quantity,
          target_unit_price: input.targetUnitPrice,
          needed_by: input.neededBy,
        })
        .eq("id", input.requestId);
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["material_request", input.requestId] });
      queryClient.invalidateQueries({ queryKey: ["material_requests", input.projectId] });
    },
  });
}

export interface SavePurchaseDetailsInput {
  requestId: string;
  projectId: string;
  quotePrice: number | null;
  quoteReceivedAt: string | null;
  attachmentsNote: string | null;
}

export function useSavePurchaseDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SavePurchaseDetailsInput) => {
      const { error } = await supabase
        .from("material_requests")
        .update({
          quote_price: input.quotePrice,
          quote_received_at: input.quoteReceivedAt,
          attachments_note: input.attachmentsNote,
        })
        .eq("id", input.requestId);
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["material_request", input.requestId] });
      queryClient.invalidateQueries({ queryKey: ["material_requests", input.projectId] });
    },
  });
}
