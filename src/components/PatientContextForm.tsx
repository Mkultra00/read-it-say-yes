import { useState } from "react";
import { usePatientProfile } from "@/hooks/usePatientProfile";
import { useStories } from "@/hooks/useStories";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, User, Users, MapPin, Heart } from "lucide-react";
import { toast } from "sonner";

export function PatientContextForm() {
  const { profile, isLoading: profileLoading, upsertProfile } = usePatientProfile();
  const { addStory } = useStories();

  const [patientName, setPatientName] = useState("");
  const [familyMembers, setFamilyMembers] = useState("");
  const [city, setCity] = useState("");
  const [memories, setMemories] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync form with loaded profile
  const isFormEmpty = !patientName && !familyMembers && !city && !memories;
  if (profile && isFormEmpty && !saved) {
    // Only set once when profile loads
    setTimeout(() => {
      setPatientName(profile.patient_name || "");
      setFamilyMembers(profile.family_members || "");
      setCity(profile.city || "");
      setMemories(profile.memories || "");
      setSaved(true);
    }, 0);
  }

  const handleGenerate = async () => {
    if (!patientName.trim()) {
      toast.error("Please enter the patient's name");
      return;
    }

    setGenerating(true);

    try {
      // Save/update the profile
      await upsertProfile({
        id: profile?.id,
        patient_name: patientName.trim(),
        family_members: familyMembers.trim(),
        city: city.trim(),
        memories: memories.trim(),
      });

      // Generate stories via AI
      const { data, error } = await supabase.functions.invoke("generate-stories", {
        body: {
          patientName: patientName.trim(),
          familyMembers: familyMembers.trim(),
          city: city.trim(),
          memories: memories.trim(),
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const stories = data?.stories;
      if (!stories?.length) throw new Error("No stories generated");

      // Save all generated stories
      for (const story of stories) {
        await addStory({
          title: story.title,
          content: story.content,
          category: story.category,
          loop_enabled: false,
        });
      }

      toast.success(`${stories.length} stories created for ${patientName}!`);
    } catch (e: any) {
      console.error("Generation error:", e);
      toast.error(e.message || "Failed to generate stories");
    } finally {
      setGenerating(false);
    }
  };

  if (profileLoading) {
    return (
      <Card className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-serif text-base font-medium text-foreground">
          Generate Stories
        </h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Enter details about the patient and AI will create personalized, comforting stories.
      </p>

      <div className="space-y-3">
        <div>
          <Label htmlFor="patient-name" className="flex items-center gap-1.5 text-xs mb-1">
            <User className="h-3 w-3" /> Patient Name *
          </Label>
          <Input
            id="patient-name"
            placeholder="e.g. Margaret"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            disabled={generating}
            maxLength={100}
          />
        </div>

        <div>
          <Label htmlFor="family" className="flex items-center gap-1.5 text-xs mb-1">
            <Users className="h-3 w-3" /> Family Members
          </Label>
          <Input
            id="family"
            placeholder="e.g. husband Tom, daughter Sarah, grandson Jake"
            value={familyMembers}
            onChange={(e) => setFamilyMembers(e.target.value)}
            disabled={generating}
            maxLength={300}
          />
        </div>

        <div>
          <Label htmlFor="city" className="flex items-center gap-1.5 text-xs mb-1">
            <MapPin className="h-3 w-3" /> City / Place
          </Label>
          <Input
            id="city"
            placeholder="e.g. Portland, Oregon"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={generating}
            maxLength={200}
          />
        </div>

        <div>
          <Label htmlFor="memories" className="flex items-center gap-1.5 text-xs mb-1">
            <Heart className="h-3 w-3" /> Important Memories & Objects
          </Label>
          <Textarea
            id="memories"
            placeholder="e.g. loved baking apple pies, had a garden with roses, played piano every Sunday, cherished a blue ceramic vase from her grandmother..."
            value={memories}
            onChange={(e) => setMemories(e.target.value)}
            disabled={generating}
            rows={3}
            maxLength={1000}
          />
        </div>
      </div>

      <Button
        className="w-full gap-2"
        onClick={handleGenerate}
        disabled={generating || !patientName.trim()}
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating stories...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate 5 Stories
          </>
        )}
      </Button>
    </Card>
  );
}
