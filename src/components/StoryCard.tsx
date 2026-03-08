import { Story } from "@/hooks/useStories";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Repeat, Clock, Play } from "lucide-react";

interface StoryCardProps {
  story: Story;
  onEdit: (story: Story) => void;
  onDelete: (id: string) => void;
  onPlay: (story: Story) => void;
}

export function StoryCard({ story, onEdit, onDelete, onPlay }: StoryCardProps) {
  return (
    <Card className="group relative overflow-hidden p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-base font-medium text-foreground">
            {story.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {story.content}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {story.category && (
              <Badge variant="secondary" className="text-xs">
                {story.category}
              </Badge>
            )}
            {story.loop_enabled && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Repeat className="h-3 w-3" />
                Loop
              </Badge>
            )}
            {story.schedule_time && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {story.schedule_time}
              </Badge>
            )}
          </div>
        </div>
        <Button
          size="icon"
          variant="default"
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={() => onPlay(story)}
        >
          <Play className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-3 flex gap-2 border-t border-border pt-3">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => onEdit(story)}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-destructive hover:text-destructive"
          onClick={() => onDelete(story.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    </Card>
  );
}
