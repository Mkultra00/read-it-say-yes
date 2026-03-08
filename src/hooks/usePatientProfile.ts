import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PatientProfile {
  id: string;
  patient_name: string;
  family_members: string;
  city: string;
  memories: string;
  created_at: string;
  updated_at: string;
}

export function usePatientProfile() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["patient-profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PatientProfile | null;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: {
      id?: string;
      patient_name: string;
      family_members: string;
      city: string;
      memories: string;
    }) => {
      if (input.id) {
        const { data, error } = await supabase
          .from("patient_profiles")
          .update({
            patient_name: input.patient_name,
            family_members: input.family_members,
            city: input.city,
            memories: input.memories,
          })
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("patient_profiles")
          .insert({
            patient_name: input.patient_name,
            family_members: input.family_members,
            city: input.city,
            memories: input.memories,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patient-profile"] }),
  });

  return {
    profile,
    isLoading,
    upsertProfile: upsertMutation.mutateAsync,
  };
}
