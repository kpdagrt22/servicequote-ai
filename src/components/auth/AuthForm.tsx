"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { supabaseConfig } from "@/lib/config";
import { safeInternalPath } from "@/lib/utils";

type Mode = "login" | "signup";

export function AuthForm({ mode, redirectedFrom }: { mode: Mode; redirectedFrom?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const configured = supabaseConfig.isConfigured;
  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase isn't configured. Add your keys to .env.local — see the README.");
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        // If email confirmation is required there's no session yet.
        if (!data.session) {
          setInfo("Check your email to confirm your account, then log in.");
          setLoading(false);
          return;
        }
        router.push("/onboarding");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Guard against open-redirect via a crafted ?redirectedFrom= query.
        router.push(safeInternalPath(redirectedFrom, "/dashboard"));
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="card p-8">
      <h1 className="text-xl font-bold text-gray-900">
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {isSignup
          ? "Start quoting in minutes. No credit card required."
          : "Log in to your ServiceQuote AI dashboard."}
      </p>

      {!configured && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Supabase isn&apos;t configured yet. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code> (see README) to enable accounts.
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {isSignup && (
          <div>
            <label className="label" htmlFor="fullName">Your name</label>
            <input
              id="fullName"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jordan Sparks"
              autoComplete="name"
            />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-brand-700">{info}</p>}

        <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading || !configured}>
          {loading ? "Please wait…" : isSignup ? "Create account" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        {isSignup ? (
          <>Already have an account? <Link href="/login" className="font-medium text-brand-700 hover:underline">Log in</Link></>
        ) : (
          <>New here? <Link href="/signup" className="font-medium text-brand-700 hover:underline">Create an account</Link></>
        )}
      </p>
    </div>
  );
}
