"use client";

import { useRef, useState } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src: string | null;
  label?: string;
  className?: string;
  unavailableMessage?: string;
}

export function AudioPlayer({
  src,
  label = "Coach advice",
  className,
  unavailableMessage = "Audio coaching unavailable for this answer.",
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-dashed border-border bg-gray-50 px-4 py-3 text-sm text-muted",
          className
        )}
      >
        <Volume2 className="h-4 w-4 shrink-0" />
        <span>{unavailableMessage}</span>
      </div>
    );
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play();
      setPlaying(true);
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3",
        className
      )}
    >
      <button
        type="button"
        onClick={togglePlay}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700 transition-colors"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-brand-800">{label}</p>
        <p className="text-xs text-muted">Pronunciation and delivery coaching</p>
      </div>
      <audio
        ref={audioRef}
        src={src}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        className="hidden"
      />
    </div>
  );
}
