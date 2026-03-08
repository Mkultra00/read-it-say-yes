import { useState, useRef, useCallback, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useStories, Story } from "@/hooks/useStories";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, Square, Loader2, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Voice = () => {
  const { stories, isLoading } = useStories();
  const [selectedStoryId, setSelectedStoryId] = useState<string>("");
  const [status, setStatus] = useState<
    "idle" | "connecting" | "playing" | "error"
  >("idle");
  const [transcript, setTranscript] = useState("");
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);

  const selectedStory = stories.find((s) => s.id === selectedStoryId);

  const log = useCallback((msg: string) => {
    console.log(`[NeuroVoice] ${msg}`);
    setDebugLog((prev) => [...prev.slice(-19), msg]);
  }, []);

  const playPcmChunk = useCallback(
    (pcmBytes: ArrayBuffer) => {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      try {
        const int16 = new Int16Array(pcmBytes);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 32768;
        }

        const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
        audioBuffer.copyToChannel(float32, 0);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        const now = ctx.currentTime;
        const startTime = Math.max(now, nextStartTimeRef.current);
        source.start(startTime);
        nextStartTimeRef.current = startTime + audioBuffer.duration;
      } catch (e) {
        log(`Audio error: ${e}`);
      }
    },
    [log]
  );

  const startSession = useCallback(async () => {
    if (!selectedStory) {
      toast.error("Please select a story first");
      return;
    }

    setStatus("connecting");
    setTranscript("");
    setDebugLog([]);
    nextStartTimeRef.current = 0;

    // Create AudioContext immediately in user gesture context
    try {
      const ctx = new AudioContext({ sampleRate: 24000 });
      await ctx.resume();
      audioContextRef.current = ctx;
      log("AudioContext created and resumed");
    } catch (e) {
      log(`AudioContext error: ${e}`);
      setStatus("error");
      return;
    }

    try {
      log("Fetching session config...");
      const { data, error } = await supabase.functions.invoke(
        "generate-token",
        {
          body: { storyContent: selectedStory.content },
        }
      );

      if (error || !data?.apiKey) {
        throw new Error(error?.message || "Failed to get session config");
      }

      log(`Got config, model: ${data.model}`);

      // Connect to Gemini Live API
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${data.apiKey}`;
      log("Connecting WebSocket...");

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        log("WebSocket connected, sending setup...");
        const setupMsg = {
          setup: {
            model: `models/${data.model}`,
            generationConfig: {
              responseModalities: ["AUDIO", "TEXT"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Aoede",
                  },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: data.systemInstruction }],
            },
          },
        };
        ws.send(JSON.stringify(setupMsg));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);

          if (msg.setupComplete) {
            log("Setup complete! Sending story to narrate...");
            setStatus("playing");
            ws.send(
              JSON.stringify({
                clientContent: {
                  turns: [
                    {
                      role: "user",
                      parts: [
                        {
                          text: `Please narrate this story now: ${selectedStory.content}`,
                        },
                      ],
                    },
                  ],
                  turnComplete: true,
                },
              })
            );
          }

          if (msg.serverContent) {
            const parts = msg.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                // Decode base64 PCM audio
                const binaryStr = atob(part.inlineData.data);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                  bytes[i] = binaryStr.charCodeAt(i);
                }
                playPcmChunk(bytes.buffer);
              }
              if (part.text) {
                setTranscript((prev) => prev + part.text);
              }
            }

            if (msg.serverContent?.turnComplete) {
              log("Narration turn complete");
              if (selectedStory.loop_enabled) {
                log("Loop enabled, restarting in 3s...");
                setTimeout(() => {
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    setTranscript("");
                    nextStartTimeRef.current = 0;
                    wsRef.current.send(
                      JSON.stringify({
                        clientContent: {
                          turns: [
                            {
                              role: "user",
                              parts: [
                                {
                                  text: `Please narrate this story again with slight variations: ${selectedStory.content}`,
                                },
                              ],
                            },
                          ],
                          turnComplete: true,
                        },
                      })
                    );
                  }
                }, 3000);
              }
            }
          }
        } catch (e) {
          log(`Message parse error: ${e}`);
        }
      };

      ws.onerror = (e) => {
        log(`WebSocket error: ${JSON.stringify(e)}`);
        setStatus("error");
        toast.error("Connection error. Please try again.");
      };

      ws.onclose = (e) => {
        log(`WebSocket closed: code=${e.code} reason=${e.reason}`);
        setStatus((prev) => (prev === "playing" ? "idle" : prev));
      };
    } catch (e: any) {
      log(`Session error: ${e.message}`);
      setStatus("error");
      toast.error(e.message || "Failed to start voice session");
    }
  }, [selectedStory, playPcmChunk, log]);

  const stopSession = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    nextStartTimeRef.current = 0;
    setStatus("idle");
    log("Session stopped");
  }, [log]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      audioContextRef.current?.close();
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
            {status === "idle" && "Select a story and start narration"}
            {status === "connecting" && "Connecting to voice agent..."}
            {status === "playing" && "Narrating your story..."}
            {status === "error" && "Something went wrong. Try again."}
          </p>
        </div>

        {/* Story selector */}
        <div className="w-full max-w-sm">
          <Select
            value={selectedStoryId}
            onValueChange={setSelectedStoryId}
            disabled={status !== "idle"}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  isLoading ? "Loading stories..." : "Select a story"
                }
              />
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
            <p className="text-sm leading-relaxed text-foreground">
              {transcript}
            </p>
          </Card>
        )}

        {/* Debug log */}
        {debugLog.length > 0 && (
          <Card className="w-full max-w-sm p-4">
            <h3 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              Debug Log
            </h3>
            <div className="max-h-40 overflow-y-auto">
              {debugLog.map((msg, i) => (
                <p key={i} className="text-xs text-muted-foreground font-mono">
                  {msg}
                </p>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
};

export default Voice;
