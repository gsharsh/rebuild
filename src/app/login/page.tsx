"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const supabase = createClient();

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        });
        if (signUpError) throw signUpError;
        setMessage("Check your email to confirm your account, then log in.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-semibold text-brand-700 text-lg"
          >
            <Mic className="h-6 w-6" />
            SpeakReady
          </Link>
          <p className="mt-2 text-sm text-muted">
            Sign in to your private rehearsal room
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            {isSignUp ? "Create account" : "Welcome back"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="text-sm text-muted block mb-1">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            )}
            <div>
              <label className="text-sm text-muted block mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                required
              />
            </div>
            <div>
              <label className="text-sm text-muted block mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {message && (
              <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                {message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Please wait…"
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted">
            {isSignUp ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                setMessage("");
              }}
              className="text-brand-600 font-medium hover:underline"
            >
              {isSignUp ? "Sign in" : "Create account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
