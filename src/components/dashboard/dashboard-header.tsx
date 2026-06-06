"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

interface DashboardHeaderProps {
  userName?: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-bold text-on-surface"
        >
          <Mic className="h-5 w-5" />
          SpeakReady
        </Link>
        <div className="flex items-center gap-3">
          {userName && (
            <span className="hidden text-sm text-on-surface-variant sm:inline">
              {userName}
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
