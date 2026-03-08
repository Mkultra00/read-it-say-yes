import { useState } from "react";
import { Story } from "@/types/story";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

interface StoryFormProps {
  initial?: Story;
  onSubmit: (data: Omit<Story, "id" | "created_at">) => void;
  onCancel: () => void;
}

export function StoryForm({ initial, onSubmit, onCancel }: StoryFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [loopEnabled, setLoopEnabled] = useState(initial?.loop_enabled ?? false);
  const [scheduleTime, setScheduleTime] = useState(initial?.schedule_time ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      content,
      category: category || undefined,
      loop_enabled: loopEnabled,
      schedule_time: scheduleTime || undefined,
    });
  };

  return (
    <Card className="p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg text-foreground">
            {initial ? "Edit Story" : "New Story"}
          </h3>
          <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Morning Garden Walk"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Story / Topic Content</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write the story or topic the voice agent will narrate..."
            rows={5}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category (optional)</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Relaxation, Memory, Exercise"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3">
          <div>
            <Label htmlFor="loop" className="text-sm font-medium">Loop Narration</Label>
            <p className="text-xs text-muted-foreground">Repeat this story continuously</p>
          </div>
          <Switch id="loop" checked={loopEnabled} onCheckedChange={setLoopEnabled} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="schedule">Schedule Time (optional)</Label>
          <Input
            id="schedule"
            type="time"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full">
          {initial ? "Save Changes" : "Add Story"}
        </Button>
      </form>
    </Card>
  );
}
