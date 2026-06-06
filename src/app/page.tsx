import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mic, BookOpen, Globe, Video } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 text-lg font-bold text-on-surface">
            <Mic className="h-5 w-5" />
            SpeakReady
          </div>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <h1 className="text-4xl font-semibold tracking-tight text-on-surface sm:text-5xl">
            Your private rehearsal room for
            <span className="text-secondary"> high-stakes speaking</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-on-surface-variant">
            Practise job interviews, visa interviews, presentations, and pitches.
            Get supportive coaching on script, speech, and presence.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/login">
              <Button size="lg">Start practising free</Button>
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: BookOpen,
                title: "Script Coach",
                desc: "Listener-friendly phrasing and interview-ready structure.",
              },
              {
                icon: Mic,
                title: "Speech Coach",
                desc: "Clearer delivery and confidence coaching for spoken answers.",
              },
              {
                icon: Globe,
                title: "Bilingual Prep",
                desc: "Practise in your language, get an easier-to-say English version.",
              },
              {
                icon: Video,
                title: "Posture Coach",
                desc: "Camera attention and posture signals for video practice.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-lg border border-outline-variant bg-surface-elevated p-6 shadow-sm"
              >
                <f.icon className="mb-3 h-8 w-8 text-secondary" />
                <h3 className="font-semibold text-on-surface">{f.title}</h3>
                <p className="mt-2 text-sm text-on-surface-variant">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
