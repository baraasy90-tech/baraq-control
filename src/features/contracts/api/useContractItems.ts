import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

function useInvalidateContract(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["contract", projectId] });
}

// ---------- بنود الكميات وسعر الوحدة ----------

export interface LineItemInput {
  contractId: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  order: number;
}

export function useAddLineItem(projectId: string | undefined) {
  const invalidate = useInvalidateContract(projectId);
  return useMutation({
    mutationFn: async (input: LineItemInput) => {
      const { error } = await supabase.from("contract_line_items").insert({
        contract_id: input.contractId,
        description: input.description,
        quantity: input.quantity,
        unit: input.unit,
        unit_price: input.unitPrice,
        order: input.order,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteLineItem(projectId: string | undefined) {
  const invalidate = useInvalidateContract(projectId);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contract_line_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

// ---------- جدول الدفعات ----------

export interface PaymentInput {
  contractId: string;
  title: string;
  dueDate: string | null;
  amount: number | null;
  percentage: number | null;
  guaranteeNote: string | null;
  order: number;
  isAdvancePayment: boolean;
}

export function useAddPayment(projectId: string | undefined) {
  const invalidate = useInvalidateContract(projectId);
  return useMutation({
    mutationFn: async (input: PaymentInput) => {
      const { error } = await supabase.from("contract_payments").insert({
        contract_id: input.contractId,
        title: input.title,
        due_date: input.dueDate,
        amount: input.amount,
        percentage: input.percentage,
        guarantee_note: input.guaranteeNote,
        order: input.order,
        is_advance_payment: input.isAdvancePayment,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useTogglePaymentPaid(projectId: string | undefined) {
  const invalidate = useInvalidateContract(projectId);
  return useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      const { error } = await supabase.from("contract_payments").update({ paid }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeletePayment(projectId: string | undefined) {
  const invalidate = useInvalidateContract(projectId);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contract_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

// ---------- خصومات المخالفات ----------

export interface DeductionInput {
  contractId: string;
  violationName: string;
  deductionAmount: number;
  damageDescription: string | null;
  deductedAt: string;
}

export function useAddDeduction(projectId: string | undefined) {
  const { user } = useAuth();
  const invalidate = useInvalidateContract(projectId);
  return useMutation({
    mutationFn: async (input: DeductionInput) => {
      if (!user) throw new Error("not authenticated");
      const { error } = await supabase.from("contract_deductions").insert({
        contract_id: input.contractId,
        violation_name: input.violationName,
        deduction_amount: input.deductionAmount,
        damage_description: input.damageDescription,
        deducted_at: input.deductedAt,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteDeduction(projectId: string | undefined) {
  const invalidate = useInvalidateContract(projectId);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contract_deductions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
