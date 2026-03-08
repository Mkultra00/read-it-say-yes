import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";

const Voice = () => {
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center space-y-6 pt-12">
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-primary/10">
          <div className="absolute inset-0 animate-pulse rounded-full bg-primary/5" />
          <Mic className="h-12 w-12 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="font-serif text-xl text-foreground">Voice Session</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a story and start a narration session powered by Gemini Live API.
          </p>
        </div>
        <Button size="lg" className="gap-2" disabled>
          <Mic className="h-5 w-5" />
          Coming Soon
        </Button>
        <p className="text-xs text-muted-foreground">
          Backend integration will be connected next.
        </p>
      </div>
    </AppShell>
  );
};

export default Voice;
