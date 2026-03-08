import { VOICE_OPTIONS, LANGUAGE_OPTIONS, useVoiceStore } from "@/hooks/useVoiceStore";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Volume2, Globe } from "lucide-react";

export function VoiceSettings() {
  const { selectedVoiceId, setSelectedVoiceId, selectedLanguageId, setSelectedLanguageId } = useVoiceStore();

  return (
    <div className="space-y-4">
      {/* Language Selection */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h3 className="font-serif text-base font-medium text-foreground">
            Narration Language
          </h3>
        </div>
        <RadioGroup
          value={selectedLanguageId}
          onValueChange={setSelectedLanguageId}
          className="grid grid-cols-2 gap-2"
        >
          {LANGUAGE_OPTIONS.map((lang) => (
            <Label
              key={lang.id}
              htmlFor={`lang-${lang.id}`}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
                selectedLanguageId === lang.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <RadioGroupItem value={lang.id} id={`lang-${lang.id}`} className="sr-only" />
              <span className="text-lg">{lang.flag}</span>
              <p className="text-sm font-medium text-foreground">{lang.name}</p>
            </Label>
          ))}
        </RadioGroup>
      </Card>

      {/* Voice Selection */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-primary" />
          <h3 className="font-serif text-base font-medium text-foreground">
            Narrator Voice
          </h3>
        </div>
        <RadioGroup
          value={selectedVoiceId}
          onValueChange={setSelectedVoiceId}
          className="grid grid-cols-2 gap-2"
        >
          {VOICE_OPTIONS.map((voice) => (
            <Label
              key={voice.id}
              htmlFor={voice.id}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
                selectedVoiceId === voice.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <RadioGroupItem value={voice.id} id={voice.id} className="sr-only" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{voice.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {voice.description}
                </p>
              </div>
            </Label>
          ))}
        </RadioGroup>
      </Card>
    </div>
  );
}