"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

export function Header({ userName }: { userName?: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-brand-700">
          <Mic className="h-5 w-5" />
          SpeakReady
        </Link>
        <div className="flex items-center gap-3">
          {userName && (
            <span className="text-sm text-muted hidden sm:inline">
              {userName}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
