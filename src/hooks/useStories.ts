import { useState, useCallback } from "react";
import { Story } from "@/types/story";

const SAMPLE_STORIES: Story[] = [
  {
    id: "1",
    title: "Morning Garden Walk",
    content:
      "Imagine walking through a sunlit garden in the early morning. The dew glistens on rose petals. A gentle breeze carries the scent of lavender. Birds sing their morning songs from the old oak tree. You follow a winding stone path past beds of marigolds and daisies, feeling the cool grass beneath your feet.",
    category: "Relaxation",
    loop_enabled: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Childhood Kitchen Memories",
    content:
      "Remember the warmth of grandmother's kitchen. The smell of freshly baked bread fills the air. Flour dusts the wooden countertop. A pot of soup simmers on the stove, filling the room with savory aromas. The old radio plays a familiar tune while sunlight streams through lace curtains.",
    category: "Memory",
    loop_enabled: true,
    schedule_time: "09:00",
    created_at: new Date().toISOString(),
  },
];

export function useStories() {
  const [stories, setStories] = useState<Story[]>(SAMPLE_STORIES);

  const addStory = useCallback((story: Omit<Story, "id" | "created_at">) => {
    const newStory: Story = {
      ...story,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    setStories((prev) => [newStory, ...prev]);
    return newStory;
  }, []);

  const updateStory = useCallback((id: string, updates: Partial<Story>) => {
    setStories((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const deleteStory = useCallback((id: string) => {
    setStories((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { stories, addStory, updateStory, deleteStory };
}
