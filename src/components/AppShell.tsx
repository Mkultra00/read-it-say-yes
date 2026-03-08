import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import pandaAvatar from "@/assets/panda-avatar.png";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-4">
          <img src={pandaAvatar} alt="Voice of Love panda mascot" className="h-48 w-48 rounded-full drop-shadow-lg" />
          <h1 className="mt-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-7xl font-serif tracking-tight text-transparent">
            Voice of Love
          </h1>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
      <BottomNav />
    </div>
  );
}
