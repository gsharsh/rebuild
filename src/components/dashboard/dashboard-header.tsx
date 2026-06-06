"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mic } from "lucide-react";

interface DashboardHeaderProps {
  userName?: string;
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
  badgeLabel?: string;
}

export function DashboardHeader({
  userName,
  backHref,
  backLabel,
  title,
  subtitle,
  badgeLabel,
}: DashboardHeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto grid min-h-14 max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-4 justify-self-start">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2 font-semibold text-brand-700"
          >
            <Mic className="h-5 w-5" />
            SpeakReady
          </Link>
          {backHref && backLabel && (
            <Link
              href={backHref}
              className="hidden shrink-0 items-center gap-1 text-sm text-muted hover:text-gray-900 sm:inline-flex"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          )}
        </div>
        {title ? (
          <div className="hidden min-w-0 justify-self-center text-center md:block">
            <div className="flex min-w-0 items-center justify-center gap-2">
              <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
              {badgeLabel && <Badge variant="info">{badgeLabel}</Badge>}
            </div>
            {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-3 justify-self-end">
          {userName && (
            <span className="hidden text-sm text-muted sm:inline">{userName}</span>
          )}
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
