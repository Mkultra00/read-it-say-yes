import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStories } from "@/hooks/useStories";
import { StoryCard } from "@/components/StoryCard";
import { StoryForm } from "@/components/StoryForm";
import { Button } from "@/components/ui/button";
import { Story } from "@/types/story";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Stories = () => {
  const { stories, addStory, updateStory, deleteStory } = useStories();
  const [editing, setEditing] = useState<Story | null>(null);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const handleCreate = (data: Omit<Story, "id" | "created_at">) => {
    addStory(data);
    setCreating(false);
    toast.success("Story added!");
  };

  const handleUpdate = (data: Omit<Story, "id" | "created_at">) => {
    if (editing) {
      updateStory(editing.id, data);
      setEditing(null);
      toast.success("Story updated!");
    }
  };

  const handleDelete = (id: string) => {
    deleteStory(id);
    toast.success("Story deleted.");
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

        {stories.length === 0 && !showForm ? (
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
