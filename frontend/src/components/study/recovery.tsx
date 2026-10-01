"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, MailCheck } from "lucide-react";
import { send, message } from "@/lib/platform-api";
import { Brand, Button, ErrorMessage, Field, Notice } from "./ui";
export function RecoveryScreen({
  mode,
}: {
  mode: "forgot" | "reset" | "verify";
}) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = new FormData(event.currentTarget);
    try {
      await send(
        mode === "forgot"
          ? "/auth/forgot-password"
          : mode === "reset"
            ? "/auth/reset-password"
            : "/auth/verify-email",
        mode === "forgot"
          ? { email: values.get("email") }
          : mode === "reset"
            ? { token, password: values.get("password") }
            : { token },
      );
      setDone(true);
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="qb-public-header">
        <Brand />
        <Link href="/study/login">
          Back to sign in <ArrowRight size={16} />
        </Link>
      </header>
      <main className="qb-recovery">
        <MailCheck size={34} strokeWidth={1.4} />
        <h1>
          {mode === "forgot"
            ? "A fresh start."
            : mode === "reset"
              ? "Choose a new password."
              : "Make it official."}
        </h1>
        <p>
          {mode === "forgot"
            ? "We’ll send a reset link if an account matches your email."
            : mode === "reset"
              ? "Use a strong password you haven’t used here before."
              : "Confirm that this email address belongs to you."}
        </p>
        <ErrorMessage>{error}</ErrorMessage>
        {done ? (
          <Notice>
            {mode === "forgot"
              ? "If the account exists, a reset link has been requested. Check your email inbox."
              : mode === "reset"
                ? "Your password has been reset. Sign in with your new password."
                : "Your email address is verified."}{" "}
            <Link href="/study/login">Sign in</Link>
          </Notice>
        ) : (
          <form onSubmit={submit}>
            {mode === "forgot" && (
              <Field label="Email address">
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                />
              </Field>
            )}
            {mode === "reset" && (
              <Field label="New password" hint="Use at least 12 characters.">
                <input
                  name="password"
                  type="password"
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
              </Field>
            )}
            {mode !== "forgot" && !token && (
              <ErrorMessage>
                This link is missing its token. Open the full link in your
                email, or request a new one.
              </ErrorMessage>
            )}
            <Button
              type="submit"
              disabled={busy || (mode !== "forgot" && !token)}
            >
              {busy
                ? "Working…"
                : mode === "forgot"
                  ? "Send reset link"
                  : mode === "reset"
                    ? "Reset password"
                    : "Verify email"}
              <ArrowRight size={17} />
            </Button>
          </form>
        )}
      </main>
    </>
  );
}
