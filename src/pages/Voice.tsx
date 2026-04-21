import { useState, useRef, useCallback, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useStories } from "@/hooks/useStories";
import { usePatientProfile } from "@/hooks/usePatientProfile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, Square, Loader2, Volume2, FlaskConical, Infinity, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceStore, VOICE_OPTIONS, LANGUAGE_OPTIONS } from "@/hooks/useVoiceStore";
import { toast } from "sonner";

const TEST_STORY = `Once upon a time, in a cozy little house by the sea, there lived a kind old woman named Rose. Every morning she would walk along the shore, collecting smooth stones and listening to the waves. The seagulls knew her well and would circle above, calling out their greetings. One day, she found a beautiful shell that sang a gentle melody when held to her ear. She carried it home and placed it on her windowsill, where it hummed softly through the night, filling her dreams with warmth and peace.`;

type SessionMode = "test" | "story" | "infinite";

const Voice = () => {
  const { stories, isLoading } = useStories();
  const { profile } = usePatientProfile();
  const [selectedStoryId, setSelectedStoryId] = useState<string>("");
  const [mode, setMode] = useState<SessionMode>("test");
  const [status, setStatus] = useState<"idle" | "generating" | "playing" | "error">("idle");
  const [transcript, setTranscript] = useState("");
  const [storyCount, setStoryCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const infiniteActiveRef = useRef(false);
  const previousTitlesRef = useRef<string[]>([]);
  const { selectedVoiceId, selectedLanguageId } = useVoiceStore();
  const selectedVoice = VOICE_OPTIONS.find((v) => v.id === selectedVoiceId);
  const selectedLanguage = LANGUAGE_OPTIONS.find((l) => l.id === selectedLanguageId);

  const selectedStory = stories.find((s) => s.id === selectedStoryId);
  const storyContent = mode === "test" ? TEST_STORY : mode === "story" ? selectedStory?.content : undefined;

  /** Generate a fresh story from patient parameters */
  const generateNewStory = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("generate-single-story", {
      body: {
        patientName: profile?.patient_name,
        familyMembers: profile?.family_members,
        city: profile?.city,
        memories: profile?.memories,
        language: selectedLanguageId,
        previousTitles: previousTitlesRef.current.slice(-5),
      },
    });
    if (error) throw new Error(error.message || "Failed to generate story");
    if (data?.error) throw new Error(data.error);
    const story = data?.story;
    if (!story?.content) throw new Error("No story generated");
    previousTitlesRef.current.push(story.title);
    return story.content;
  }, [profile, selectedLanguageId]);

  /** Narrate text: enhance via Gemini, then TTS via ElevenLabs */
  const narrateText = useCallback(async (text: string): Promise<HTMLAudioElement> => {
    const { data: narrationData, error: narrationError } = await supabase.functions.invoke(
      "generate-token",
      { body: { storyContent: text, language: selectedLanguageId, patientName: profile?.patient_name } }
    );
    if (narrationError) throw new Error(narrationError.message || "Failed to generate narration");
    if (narrationData?.error) throw new Error(narrationData.error);

    const narrationText = narrationData?.narration || text;
    setTranscript(narrationText);

    const ttsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
    const response = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text: narrationText, voiceId: selectedVoiceId }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `TTS failed: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.onplay = () => setStatus("playing");
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      throw new Error("Audio playback error");
    };

    return audio;
  }, [selectedVoiceId, selectedLanguageId, profile?.patient_name]);

  /** Play a single narration (test or story mode) */
  const startNarration = useCallback(async () => {
    if (!storyContent) {
      toast.error("No story content to narrate");
      return;
    }
    setStatus("generating");
    setTranscript("");
    try {
      const audio = await narrateText(storyContent);
      audioRef.current = audio;
      audio.onended = () => {
        setStatus("idle");
        toast.success("Narration complete!");
      };
      await audio.play();
    } catch (e: any) {
      console.error("Narration error:", e);
      setStatus("error");
      toast.error(e.message || "Failed to generate narration");
    }
  }, [storyContent, narrateText]);

  /** Infinite mode loop: generate → narrate → play → repeat */
  const runInfiniteLoop = useCallback(async () => {
    if (!profile?.patient_name) {
      toast.error("Please set up a patient profile first on the home page");
      return;
    }
    infiniteActiveRef.current = true;
    previousTitlesRef.current = [];
    setStoryCount(0);

    const playNext = async () => {
      if (!infiniteActiveRef.current) return;

      setStatus("generating");
      setTranscript("");

      try {
        const content = await generateNewStory();
        if (!infiniteActiveRef.current) return;

        const audio = await narrateText(content);
        if (!infiniteActiveRef.current) {
          audio.pause();
          return;
        }

        audioRef.current = audio;
        setStoryCount((c) => c + 1);

        audio.onended = () => {
          if (infiniteActiveRef.current) {
            playNext();
          } else {
            setStatus("idle");
          }
        };

        await audio.play();
      } catch (e: any) {
        console.error("Infinite mode error:", e);
        if (infiniteActiveRef.current) {
          toast.error(e.message || "Error generating story, retrying...");
          // Wait a bit then retry
          setTimeout(() => {
            if (infiniteActiveRef.current) playNext();
          }, 3000);
        }
      }
    };

    await playNext();
  }, [profile, generateNewStory, narrateText]);

  const stopSession = useCallback(() => {
    infiniteActiveRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    previousTitlesRef.current = [];
    setTranscript("");
    setStoryCount(0);
    setStatus("idle");
    toast.success("Narration stopped");
  }, []);

  useEffect(() => {
    return () => {
      infiniteActiveRef.current = false;
      audioRef.current?.pause();
    };
  }, []);

  const canStart = mode === "test" || mode === "infinite" || (mode === "story" && selectedStoryId && !isLoading);
  const needsProfile = mode === "infinite" && !profile?.patient_name;

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
            mode === "infinite" ? (
              <Infinity className="h-12 w-12 text-primary" />
            ) : (
              <Volume2 className="h-12 w-12 text-primary" />
            )
          ) : (
            <Mic className="h-12 w-12 text-primary" />
          )}
        </div>

        <div className="text-center">
          <h2 className="font-serif text-xl text-foreground">Voice Session</h2>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            {selectedVoice && (
              <p className="text-xs text-primary font-medium">
                Voice: {selectedVoice.name}
              </p>
            )}
            {selectedLanguage && (
              <p className="text-xs text-muted-foreground">
                {selectedLanguage.flag} {selectedLanguage.name}
              </p>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === "idle" && mode === "test" && "Test mode — AI narration with realistic voice"}
            {status === "idle" && mode === "story" && "Select a story and start narration"}
            {status === "idle" && mode === "infinite" && "Infinite mode — endlessly generates & narrates new stories"}
            {status === "generating" && (mode === "infinite" ? "Creating a new story..." : "Crafting your narration...")}
            {status === "playing" && mode === "infinite" && `Playing story #${storyCount}...`}
            {status === "playing" && mode !== "infinite" && "Narrating your story..."}
            {status === "error" && "Something went wrong. Try again."}
          </p>
        </div>

        {/* Mode selector */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="mode-test" className="text-sm cursor-pointer">Test</Label>
            <Switch
              id="mode-test"
              checked={mode === "test"}
              onCheckedChange={(on) => on && setMode("test")}
              disabled={status !== "idle"}
            />
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="mode-story" className="text-sm cursor-pointer">Story</Label>
            <Switch
              id="mode-story"
              checked={mode === "story"}
              onCheckedChange={(on) => on && setMode("story")}
              disabled={status !== "idle"}
            />
          </div>
          <div className="flex items-center gap-2">
            <Infinity className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="mode-infinite" className="text-sm cursor-pointer">Infinite</Label>
            <Switch
              id="mode-infinite"
              checked={mode === "infinite"}
              onCheckedChange={(on) => on && setMode("infinite")}
              disabled={status !== "idle"}
            />
          </div>
        </div>

        {/* Story selector (story mode only) */}
        {mode === "story" && (
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

        {/* Profile reminder for infinite mode */}
        {needsProfile && (
          <p className="max-w-sm text-center text-xs text-destructive">
            Please fill in the patient profile on the home page first so stories can be personalized.
          </p>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          {status === "idle" || status === "error" ? (
            <Button
              size="lg"
              className="gap-2"
              onClick={mode === "infinite" ? runInfiniteLoop : startNarration}
              disabled={!canStart || needsProfile}
            >
              {mode === "infinite" ? (
                <>
                  <Infinity className="h-5 w-5" />
                  Start Infinite Mode
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5" />
                  {mode === "test" ? "Play Test Story" : "Start Narration"}
                </>
              )}
            </Button>
          ) : status === "generating" ? (
            <Button size="lg" variant="destructive" className="gap-2" onClick={stopSession}>
              <Square className="h-5 w-5" />
              Stop
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
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase text-muted-foreground">
                {mode === "infinite" ? `Story #${storyCount}` : "AI Narration"}
              </h3>
              {mode === "infinite" && storyCount > 0 && (
                <span className="text-xs text-primary font-medium">
                  ∞ Infinite Mode
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed text-foreground">{transcript}</p>
          </Card>
        )}

        {mode === "test" && status === "idle" && (
          <p className="max-w-sm text-center text-xs text-muted-foreground">
            Gemini enhances your story, then ElevenLabs speaks it with a realistic voice. Switch to Infinite mode for endless personalized stories.
          </p>
        )}

        {mode === "infinite" && status === "idle" && (
          <p className="max-w-sm text-center text-xs text-muted-foreground">
            Infinite mode continuously generates new personalized stories using the patient's profile and plays them one after another — perfect for extended listening sessions.
          </p>
        )}
      </div>
    </AppShell>
  );
};

export default Voice;
