import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mic, BookOpen, Globe, Video } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold text-brand-700">
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
        <section className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
            Your private rehearsal room for
            <span className="text-brand-600"> high-stakes speaking</span>
          </h1>
          <p className="mt-6 text-lg text-muted max-w-2xl mx-auto">
            Practise job interviews, visa interviews, presentations, and pitches.
            Get supportive coaching on script, speech, bilingual prep, and presence —
            built for smart students who deserve great coaching.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/login">
              <Button size="lg">Start practising free</Button>
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                className="rounded-xl border border-border bg-white p-6"
              >
                <f.icon className="h-8 w-8 text-brand-600 mb-3" />
                <h3 className="font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
