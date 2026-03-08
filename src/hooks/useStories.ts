import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Story = Tables<"stories">;
type StoryInsert = TablesInsert<"stories">;
type StoryUpdate = TablesUpdate<"stories">;

export function useStories() {
  const queryClient = useQueryClient();

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (story: StoryInsert) => {
      const { data, error } = await supabase
        .from("stories")
        .insert(story)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stories"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: StoryUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("stories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stories"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stories"] }),
  });

  return {
    stories,
    isLoading,
    addStory: addMutation.mutateAsync,
    updateStory: updateMutation.mutateAsync,
    deleteStory: deleteMutation.mutateAsync,
  };
}
