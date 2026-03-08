import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useStories } from "@/hooks/useStories";
import { StoryCard } from "@/components/StoryCard";
import { VoiceSettings } from "@/components/VoiceSettings";
import { PatientContextForm } from "@/components/PatientContextForm";
import { Button } from "@/components/ui/button";
import { BookOpen, Mic, Plus, Loader2 } from "lucide-react";

const Index = () => {
  const { stories, isLoading } = useStories();
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Hero */}
        <div className="rounded-2xl bg-primary p-6 text-primary-foreground">
          <h2 className="font-serif text-2xl">Welcome to Voice of Love</h2>
          <p className="mt-2 text-sm opacity-80">
            Create stories and topics, then let the AI voice agent narrate them
            for you in a warm, calming voice.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate("/stories")}
            >
              <BookOpen className="h-4 w-4" />
              Manage Stories
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate("/voice")}
            >
              <Mic className="h-4 w-4" />
              Voice Session
            </Button>
          </div>
        </div>

        {/* Patient Context & Story Generation */}
        <PatientContextForm />

        {/* Voice Settings */}
        <VoiceSettings />

        {/* Recent Stories */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg text-foreground">Recent Stories</h2>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => navigate("/stories")}
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : stories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No stories yet. Create your first one!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stories.slice(0, 3).map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onEdit={() => navigate("/stories")}
                  onDelete={() => {}}
                  onPlay={() => navigate("/voice")}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default Index;
