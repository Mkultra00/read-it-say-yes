import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStories, Story } from "@/hooks/useStories";
import { StoryCard } from "@/components/StoryCard";
import { StoryForm } from "@/components/StoryForm";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Stories = () => {
  const { stories, isLoading, addStory, updateStory, deleteStory } = useStories();
  const [editing, setEditing] = useState<Story | null>(null);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async (data: {
    title: string;
    content: string;
    category?: string | null;
    loop_enabled: boolean;
    schedule_time?: string | null;
  }) => {
    try {
      await addStory(data);
      setCreating(false);
      toast.success("Story added!");
    } catch {
      toast.error("Failed to add story");
    }
  };

  const handleUpdate = async (data: {
    title: string;
    content: string;
    category?: string | null;
    loop_enabled: boolean;
    schedule_time?: string | null;
  }) => {
    if (editing) {
      try {
        await updateStory({ id: editing.id, ...data });
        setEditing(null);
        toast.success("Story updated!");
      } catch {
        toast.error("Failed to update story");
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteStory(id);
      toast.success("Story deleted.");
    } catch {
      toast.error("Failed to delete story");
    }
  };

  const showForm = creating || editing;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-foreground">Stories</h2>
          {!showForm && (
            <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              New Story
            </Button>
          )}
        </div>

        {creating && (
          <StoryForm onSubmit={handleCreate} onCancel={() => setCreating(false)} />
        )}

        {editing && (
          <StoryForm
            initial={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : stories.length === 0 && !showForm ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">
              No stories yet. Tap "New Story" to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                onEdit={(s) => {
                  setCreating(false);
                  setEditing(s);
                }}
                onDelete={handleDelete}
                onPlay={() => navigate("/voice")}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Stories;
