import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import pandaAvatar from "@/assets/panda-avatar.png";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={pandaAvatar} alt="Voice of Love panda mascot" className="h-12 w-12 rounded-full" />
            <h1 className="text-xl font-serif tracking-tight text-primary">
              Voice of Love
            </h1>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
      <BottomNav />
    </div>
  );
}
