"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BoltIcon } from "@/components/icons";
import { Button, ErrorNote } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { claimOwnerAccount } from "./actions";

/** `hasOwner` decides whether this is a sign-in or a one-time setup. */
export function LoginForm({ hasOwner }: { hasOwner: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      setError("Email or password is incorrect.");
      return false;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      await supabase.auth.signOut();
      setError("This account can't access the dashboard.");
      return false;
    }
    return true;
  };

  const setUp = async () => {
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return false;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return false;
    }

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Could not create the owner account.");
      return false;
    }

    const claimed = await claimOwnerAccount(data.user.id, email.trim());
    if (!claimed.ok) {
      setError(claimed.error);
      return false;
    }

    // Email confirmation leaves no session — sign in explicitly.
    if (!data.session) {
      const { error: postError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (postError) {
        setError("Account created. Confirm your email address, then sign in.");
        return false;
      }
    }
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const success = hasOwner ? await signIn() : await setUp();

    if (!success) {
      setBusy(false);
      return;
    }

    router.replace(next);
    router.refresh();
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-7 flex flex-col items-center text-center">
        <BoltIcon className="h-6 w-6 text-accent-500" />
        <h1 className="mt-3 text-lg font-semibold text-text-hi">SZepto Admin</h1>
        <p className="mt-1 text-[13px] text-text-dim">
          {hasOwner ? "Sign in to your store dashboard" : "Set up your owner account"}
        </p>
      </div>

      <form onSubmit={submit} className="rounded-2xl border border-line bg-shell-900 p-5">
        {!hasOwner && (
          <p className="mb-4 rounded-lg bg-shell-850 px-3 py-2.5 text-[12px] text-text-dim">
            No owner set. This account becomes the only one that can sign in.
          </p>
        )}

        <label className="block">
          <span className="label">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="field"
          />
        </label>

        <label className="mt-3.5 block">
          <span className="label">Password</span>
          <input
            type="password"
            required
            autoComplete={hasOwner ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="field"
          />
        </label>

        {!hasOwner && (
          <label className="mt-3.5 block">
            <span className="label">Confirm password</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="field"
            />
          </label>
        )}

        {error && (
          <div className="mt-3.5">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" disabled={busy} className="mt-4 w-full">
          {busy
            ? hasOwner
              ? "Signing in…"
              : "Creating account…"
            : hasOwner
              ? "Sign in"
              : "Create owner account"}
        </Button>
      </form>
    </div>
  );
}
