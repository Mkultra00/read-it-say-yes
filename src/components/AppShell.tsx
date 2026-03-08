import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import pandaAvatar from "@/assets/panda-avatar.png";

const floatingItems = [
  { emoji: "🎵", delay: "0s", duration: "3s", left: "10%", size: "text-5xl" },
  { emoji: "❤️", delay: "0.5s", duration: "3.5s", left: "85%", size: "text-4xl" },
  { emoji: "🎶", delay: "1s", duration: "2.8s", left: "25%", size: "text-6xl" },
  { emoji: "💕", delay: "1.5s", duration: "3.2s", left: "75%", size: "text-5xl" },
  { emoji: "♪", delay: "0.3s", duration: "3.8s", left: "50%", size: "text-4xl" },
  { emoji: "💗", delay: "2s", duration: "3s", left: "60%", size: "text-5xl" },
  { emoji: "🎵", delay: "0.8s", duration: "2.5s", left: "35%", size: "text-4xl" },
  { emoji: "💖", delay: "1.2s", duration: "3.6s", left: "90%", size: "text-6xl" },
  { emoji: "♫", delay: "1.8s", duration: "2.9s", left: "5%", size: "text-5xl" },
  { emoji: "❤️", delay: "0.6s", duration: "3.3s", left: "45%", size: "text-4xl" },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg overflow-hidden">
        <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-4">
          <div className="relative">
            {floatingItems.map((item, i) => (
              <span
                key={i}
                className={`absolute ${item.size} pointer-events-none animate-float opacity-80`}
                style={{
                  left: item.left,
                  animationDelay: item.delay,
                  animationDuration: item.duration,
                  bottom: "10%",
                }}
              >
                {item.emoji}
              </span>
            ))}
            <img src={pandaAvatar} alt="Voice of Love panda mascot" className="h-96 w-96 rounded-full drop-shadow-lg relative z-10" />
          </div>
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
