"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { send, message } from "@/lib/platform-api";
import { Brand, Button, ErrorMessage, Field } from "./ui";
export function AuthScreen({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const [role, setRole] = useState("STUDENT");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("role") === "instructor"
    )
      setRole("INSTRUCTOR");
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = new FormData(event.currentTarget);
    try {
      await send(register ? "/auth/register" : "/auth/login", {
        ...(register ? { name: values.get("name"), role } : {}),
        email: values.get("email"),
        password: values.get("password"),
      });
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(
        next?.startsWith("/study/") &&
          !next.startsWith("//") &&
          !next.includes("login")
          ? next
          : "/study",
      );
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
        <Link href={register ? "/study/login" : "/study/register"}>
          {register
            ? "Already have an account? Sign in"
            : "New here? Create an account"}{" "}
          <ArrowRight size={16} />
        </Link>
      </header>
      <main className="qb-auth-layout">
        <div className="qb-auth-story">
          <h1>
            {register ? (
              <>
                A little curiosity.
                <br />A world of possibility.
              </>
            ) : (
              <>
                Your next chapter
                <br />
                starts here.
              </>
            )}
          </h1>
          <p>
            A quiet corner for questions, discoveries, and the ideas you want to
            keep.
          </p>
          <div className="qb-auth-principle">
            <LockKeyhole size={21} />
            <p>
              Private practice for independent learners.
              <br />
              Shared assignments when you’re teaching.
            </p>
          </div>
        </div>
        <section className="qb-auth-form">
          <h2>{register ? "Make yourself at home." : "Welcome back."}</h2>
          <p>
            {register
              ? "Create your personal study workspace."
              : "Sign in to pick up where you left off."}
          </p>
          <ErrorMessage>{error}</ErrorMessage>
          <form onSubmit={submit}>
            {register && (
              <Field label="Your name">
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={120}
                  placeholder="How should we greet you?"
                />
              </Field>
            )}
            <Field label="Email address">
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="you@example.com"
              />
            </Field>
            <Field
              label="Password"
              hint={register ? "Use at least 12 characters." : undefined}
            >
              <span className="qb-password">
                <input
                  name="password"
                  type={passwordVisible ? "text" : "password"}
                  autoComplete={register ? "new-password" : "current-password"}
                  minLength={register ? 12 : undefined}
                  maxLength={128}
                  required
                />
                <button
                  type="button"
                  aria-label={
                    passwordVisible ? "Hide password" : "Show password"
                  }
                  onClick={() => setPasswordVisible(!passwordVisible)}
                >
                  {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </Field>
            {register && (
              <fieldset className="qb-role-choice">
                <legend>I’m here to…</legend>
                <label>
                  <input
                    type="radio"
                    name="role"
                    value="STUDENT"
                    checked={role === "STUDENT"}
                    onChange={() => setRole("STUDENT")}
                  />
                  <span>
                    <strong>Study for myself</strong>
                    <small>Private quizzes and personal practice</small>
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="role"
                    value="INSTRUCTOR"
                    checked={role === "INSTRUCTOR"}
                    onChange={() => setRole("INSTRUCTOR")}
                  />
                  <span>
                    <strong>Study and teach</strong>
                    <small>Plus courses and assignments</small>
                  </span>
                </label>
              </fieldset>
            )}
            <Button className="qb-full" disabled={busy} type="submit">
              {busy
                ? "Opening your workspace…"
                : register
                  ? "Create my workspace"
                  : "Sign in"}
              <ArrowRight size={18} />
            </Button>
          </form>
          {!register && (
            <Link
              className="qb-text-link qb-forgot"
              href="/study/forgot-password"
            >
              Forgot your password?
            </Link>
          )}
          <p className="qb-auth-fine">
            {register
              ? "You can create private quizzes with either account type."
              : "Your saved quizzes and attempts will be waiting."}
          </p>
        </section>
      </main>
    </>
  );
}
