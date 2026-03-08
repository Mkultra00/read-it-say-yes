import { useState, useRef, useCallback, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useStories } from "@/hooks/useStories";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, Square, Loader2, Volume2, FlaskConical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TEST_STORY = `Once upon a time, in a cozy little house by the sea, there lived a kind old woman named Rose. Every morning she would walk along the shore, collecting smooth stones and listening to the waves. The seagulls knew her well and would circle above, calling out their greetings. One day, she found a beautiful shell that sang a gentle melody when held to her ear. She carried it home and placed it on her windowsill, where it hummed softly through the night, filling her dreams with warmth and peace.`;

const Voice = () => {
  const { stories, isLoading } = useStories();
  const [selectedStoryId, setSelectedStoryId] = useState<string>("");
  const [testMode, setTestMode] = useState(true);
  const [status, setStatus] = useState<"idle" | "generating" | "playing" | "error">("idle");
  const [transcript, setTranscript] = useState("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const selectedStory = stories.find((s) => s.id === selectedStoryId);
  const storyContent = testMode ? TEST_STORY : selectedStory?.content;

  const startNarration = useCallback(async () => {
    if (!storyContent) {
      toast.error("No story content to narrate");
      return;
    }

    setStatus("generating");
    setTranscript("");
    window.speechSynthesis.cancel();

    try {
      // Call Gemini via edge function to generate enhanced narration
      const { data, error } = await supabase.functions.invoke("generate-token", {
        body: { storyContent },
      });

      if (error) throw new Error(error.message || "Failed to generate narration");
      if (data?.error) throw new Error(data.error);

      const narration = data.narration;
      if (!narration) throw new Error("No narration returned");

      setTranscript(narration);

      // Play narration with browser TTS
      const utterance = new SpeechSynthesisUtterance(narration);
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.name.includes("Samantha") || v.name.includes("Google") || v.name.includes("Female")
      );
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setStatus("playing");
      utterance.onend = () => {
        setStatus("idle");
        toast.success("Narration complete!");
      };
      utterance.onerror = (e) => {
        if (e.error !== "canceled") {
          setStatus("error");
          toast.error(`Speech error: ${e.error}`);
        }
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (e: any) {
      console.error("Narration error:", e);
      setStatus("error");
      toast.error(e.message || "Failed to generate narration");
    }
  }, [storyContent]);

  const stopSession = useCallback(() => {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setStatus("idle");
  }, []);

  useEffect(() => {
    window.speechSynthesis.getVoices();
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  return (
    <AppShell>
      <div className="flex flex-col items-center space-y-6 pt-6">
        {/* Animated orb */}
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-primary/10">
          {status === "playing" && (
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20" />
          )}
          {status === "generating" ? (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          ) : status === "playing" ? (
            <Volume2 className="h-12 w-12 text-primary" />
          ) : (
            <Mic className="h-12 w-12 text-primary" />
          )}
        </div>

        <div className="text-center">
          <h2 className="font-serif text-xl text-foreground">Voice Session</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === "idle" && (testMode ? "Test mode — AI-enhanced narration" : "Select a story and start narration")}
            {status === "generating" && "Gemini is crafting your narration..."}
            {status === "playing" && "Narrating your story..."}
            {status === "error" && "Something went wrong. Try again."}
          </p>
        </div>

        {/* Test mode toggle */}
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="test-mode" className="text-sm">Test Mode</Label>
          <Switch
            id="test-mode"
            checked={testMode}
            onCheckedChange={setTestMode}
            disabled={status !== "idle"}
          />
        </div>

        {/* Story selector */}
        {!testMode && (
          <div className="w-full max-w-sm">
            <Select value={selectedStoryId} onValueChange={setSelectedStoryId} disabled={status !== "idle"}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading stories..." : "Select a story"} />
              </SelectTrigger>
              <SelectContent>
                {stories.map((story) => (
                  <SelectItem key={story.id} value={story.id}>{story.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          {status === "idle" || status === "error" ? (
            <Button
              size="lg"
              className="gap-2"
              onClick={startNarration}
              disabled={!testMode && (!selectedStoryId || isLoading)}
            >
              <Mic className="h-5 w-5" />
              {testMode ? "Play Test Story" : "Start Narration"}
            </Button>
          ) : (
            <Button size="lg" variant="destructive" className="gap-2" onClick={stopSession}>
              <Square className="h-5 w-5" />
              Stop
            </Button>
          )}
        </div>

        {/* Transcript */}
        {transcript && (
          <Card className="w-full max-w-sm p-4">
            <h3 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              AI Narration
            </h3>
            <p className="text-sm leading-relaxed text-foreground">{transcript}</p>
          </Card>
        )}

        {testMode && status === "idle" && (
          <p className="max-w-sm text-center text-xs text-muted-foreground">
            Gemini enhances your story into a warm narration, then plays it with browser speech. Turn off test mode to use your saved stories.
          </p>
        )}
      </div>
    </AppShell>
  );
};

export default Voice;
