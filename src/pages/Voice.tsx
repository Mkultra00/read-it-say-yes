import { useState, useRef, useCallback, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useStories, Story } from "@/hooks/useStories";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Square, Loader2, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Voice = () => {
  const { stories, isLoading } = useStories();
  const [selectedStoryId, setSelectedStoryId] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "connecting" | "playing" | "error">("idle");
  const [transcript, setTranscript] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  const selectedStory = stories.find((s) => s.id === selectedStoryId);

  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const buffer = audioQueueRef.current.shift();
      if (!buffer || !audioContextRef.current) break;

      try {
        // Convert raw PCM 16-bit LE to AudioBuffer
        const pcmData = new Int16Array(buffer);
        const floatData = new Float32Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
          floatData[i] = pcmData[i] / 32768;
        }

        const audioBuffer = audioContextRef.current.createBuffer(1, floatData.length, 24000);
        audioBuffer.copyToChannel(floatData, 0);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);

        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
      } catch (e) {
        console.error("Audio playback error:", e);
      }
    }

    isPlayingRef.current = false;
  }, []);

  const startSession = useCallback(async () => {
    if (!selectedStory) {
      toast.error("Please select a story first");
      return;
    }

    setStatus("connecting");
    setTranscript("");
    audioQueueRef.current = [];

    try {
      // Get API key and config from edge function
      const { data, error } = await supabase.functions.invoke("generate-token", {
        body: { storyContent: selectedStory.content },
      });

      if (error || !data?.apiKey) {
        throw new Error(error?.message || "Failed to get session config");
      }

      // Initialize AudioContext
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      // Connect to Gemini Live API via WebSocket
      const model = data.model;
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${data.apiKey}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        // Send setup message
        ws.send(JSON.stringify({
          setup: {
            model: `models/${model}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Aoede"
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{ text: data.systemInstruction }]
            }
          }
        }));
      };

      ws.onmessage = (event) => {
        try {
          if (typeof event.data === 'string') {
            const msg = JSON.parse(event.data);

            // Handle setup complete
            if (msg.setupComplete) {
              console.log("Setup complete, sending story");
              setStatus("playing");
              // Send the story content as a message to narrate
              ws.send(JSON.stringify({
                clientContent: {
                  turns: [{
                    role: "user",
                    parts: [{ text: `Please narrate this story: ${selectedStory.content}` }]
                  }],
                  turnComplete: true
                }
              }));
            }

            // Handle server content with audio
            if (msg.serverContent) {
              const parts = msg.serverContent?.modelTurn?.parts || [];
              for (const part of parts) {
                if (part.inlineData?.data) {
                  // Decode base64 audio
                  const binaryStr = atob(part.inlineData.data);
                  const bytes = new Uint8Array(binaryStr.length);
                  for (let i = 0; i < binaryStr.length; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                  }
                  audioQueueRef.current.push(bytes.buffer);
                  playAudioQueue();
                }
                if (part.text) {
                  setTranscript((prev) => prev + part.text);
                }
              }

              // Check if turn is complete
              if (msg.serverContent?.turnComplete) {
                console.log("Narration complete");
                // If loop is enabled, restart after a pause
                if (selectedStory.loop_enabled) {
                  setTimeout(() => {
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                      setTranscript("");
                      ws.send(JSON.stringify({
                        clientContent: {
                          turns: [{
                            role: "user",
                            parts: [{ text: `Please narrate this story again with slight variations: ${selectedStory.content}` }]
                          }],
                          turnComplete: true
                        }
                      }));
                    }
                  }, 3000);
                }
              }
            }
          }
        } catch (e) {
          console.error("Message parse error:", e);
        }
      };

      ws.onerror = (e) => {
        console.error("WebSocket error:", e);
        setStatus("error");
        toast.error("Connection error. Please try again.");
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        if (status === "playing") {
          setStatus("idle");
        }
      };
    } catch (e: any) {
      console.error("Session start error:", e);
      setStatus("error");
      toast.error(e.message || "Failed to start voice session");
    }
  }, [selectedStory, playAudioQueue, status]);

  const stopSession = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setStatus("idle");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

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
            {status === "idle" && "Select a story and start narration"}
            {status === "connecting" && "Connecting to voice agent..."}
            {status === "playing" && "Narrating your story..."}
            {status === "error" && "Something went wrong. Try again."}
          </p>
        </div>

        {/* Story selector */}
        <div className="w-full max-w-sm">
          <Select value={selectedStoryId} onValueChange={setSelectedStoryId} disabled={status !== "idle"}>
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

        {/* Controls */}
        <div className="flex gap-3">
          {status === "idle" || status === "error" ? (
            <Button
              size="lg"
              className="gap-2"
              onClick={startSession}
              disabled={!selectedStoryId || isLoading}
            >
              <Mic className="h-5 w-5" />
              Start Narration
            </Button>
          ) : (
            <Button
              size="lg"
              variant="destructive"
              className="gap-2"
              onClick={stopSession}
            >
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
      </div>
    </AppShell>
  );
};

export default Voice;
