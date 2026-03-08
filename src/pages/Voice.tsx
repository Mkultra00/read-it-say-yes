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
import { toast } from "sonner";

const TEST_STORY = `Once upon a time, in a cozy little house by the sea, there lived a kind old woman named Rose. Every morning she would walk along the shore, collecting smooth stones and listening to the waves. The seagulls knew her well and would circle above, calling out their greetings. One day, she found a beautiful shell that sang a gentle melody when held to her ear. She carried it home and placed it on her windowsill, where it hummed softly through the night, filling her dreams with warmth and peace.`;

const Voice = () => {
  const { stories, isLoading } = useStories();
  const [selectedStoryId, setSelectedStoryId] = useState<string>("");
  const [testMode, setTestMode] = useState(true);
  const [status, setStatus] = useState<"idle" | "connecting" | "playing" | "error">("idle");
  const [transcript, setTranscript] = useState("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const selectedStory = stories.find((s) => s.id === selectedStoryId);
  const storyContent = testMode ? TEST_STORY : selectedStory?.content;

  const startTTS = useCallback(() => {
    if (!storyContent) {
      toast.error("No story content to narrate");
      return;
    }

    setStatus("connecting");
    setTranscript("");

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(storyContent);
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to pick a nice voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.name.includes("Samantha") || v.name.includes("Google") || v.name.includes("Female")
    );
    if (preferred) utterance.voice = preferred;

    let spokenSoFar = "";
    const words = storyContent.split(" ");
    let wordIndex = 0;

    utterance.onstart = () => {
      setStatus("playing");
    };

    utterance.onboundary = (e) => {
      if (e.name === "word" && wordIndex < words.length) {
        spokenSoFar += (wordIndex > 0 ? " " : "") + words[wordIndex];
        wordIndex++;
        setTranscript(spokenSoFar);
      }
    };

    utterance.onend = () => {
      setTranscript(storyContent);
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
  }, [storyContent]);

  const stopSession = useCallback(() => {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setStatus("idle");
  }, []);

  useEffect(() => {
    // Load voices
    window.speechSynthesis.getVoices();
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <AppShell>
      <div className="flex flex-col items-center space-y-6 pt-6">
        {/* Animated orb */}
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-primary/10">
          {status === "playing" && (
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20" />
          )}
          {status === "connecting" ? (
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
            {status === "idle" && (testMode ? "Test mode — uses browser speech" : "Select a story and start narration")}
            {status === "connecting" && "Starting narration..."}
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

        {/* Story selector (hidden in test mode) */}
        {!testMode && (
          <div className="w-full max-w-sm">
            <Select
              value={selectedStoryId}
              onValueChange={setSelectedStoryId}
              disabled={status !== "idle"}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading stories..." : "Select a story"} />
              </SelectTrigger>
              <SelectContent>
                {stories.map((story) => (
                  <SelectItem key={story.id} value={story.id}>
                    {story.title}
                  </SelectItem>
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
              onClick={startTTS}
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
              Transcript
            </h3>
            <p className="text-sm leading-relaxed text-foreground">{transcript}</p>
          </Card>
        )}

        {/* Test mode info */}
        {testMode && status === "idle" && (
          <p className="max-w-sm text-center text-xs text-muted-foreground">
            Test mode uses your browser's built-in speech synthesis. Turn off test mode to use your saved stories.
          </p>
        )}
      </div>
    </AppShell>
  );
};

export default Voice;
