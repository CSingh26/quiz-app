"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Monitor, Moon, ShieldCheck, Sun, Trash2 } from "lucide-react";
import { api, send, date, message } from "@/lib/platform-api";
import { useUser } from "./shell";
import { useTheme } from "./providers";
import {
  Button,
  ErrorMessage,
  Field,
  Loading,
  Notice,
  PageTitle,
  Tag,
} from "./ui";
type Session = {
  id: string;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};
export function SettingsScreen() {
  const user = useUser();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const load = useCallback(
    () =>
      api<{ sessions: Session[] }>("/sessions")
        .then((data) => setSessions(data.sessions))
        .catch((error) => setError(message(error))),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  async function revoke(session: Session) {
    setBusy(true);
    setError("");
    try {
      await api(`/sessions/${session.id}`, { method: "DELETE" });
      if (session.current) router.replace("/study/login");
      else {
        setNotice(
          "Session revoked. That session can no longer access your account.",
        );
        await load();
      }
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  async function deleteAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const password = new FormData(event.currentTarget).get("password");
    try {
      await send("/account", { password }, "DELETE");
      router.replace("/study/register");
    } catch (error) {
      setError(message(error));
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Make this space yours."
        description="Your account, your sessions, and the light you like to work in."
      />
      <ErrorMessage>{error}</ErrorMessage>
      {notice && (
        <Notice>
          <Check size={17} />
          {notice}
        </Notice>
      )}
      <div className="qb-settings-sections">
        <section>
          <div>
            <h2>Your account</h2>
            <p>The details that identify your workspace.</p>
          </div>
          <div>
            <dl className="qb-account-details">
              <div>
                <dt>Name</dt>
                <dd>{user?.name}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user?.email}</dd>
              </div>
              <div>
                <dt>Workspace</dt>
                <dd>
                  {user?.role === "STUDENT" ? "Personal learner" : "Instructor"}
                </dd>
              </div>
            </dl>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await send("/auth/send-verification");
                  setNotice(
                    "Verification email requested. Check your inbox for the link.",
                  );
                } catch (error) {
                  setError(message(error));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <ShieldCheck size={16} />
              Send email verification
            </Button>
          </div>
        </section>
        <section>
          <div>
            <h2>A comfortable view</h2>
            <p>Choose a theme, or let your device decide.</p>
          </div>
          <fieldset className="qb-theme-picker">
            <legend className="qb-sr-only">Color theme</legend>
            {(
              [
                { value: "light", label: "Light", icon: Sun },
                { value: "dark", label: "Dark", icon: Moon },
                { value: "system", label: "System", icon: Monitor },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <label key={value} className={theme === value ? "selected" : ""}>
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={theme === value}
                  onChange={() => setTheme(value)}
                />
                <Icon size={24} strokeWidth={1.5} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
        </section>
        <section>
          <div>
            <h2>Active sessions</h2>
            <p>
              Revoke a session to sign out that device. Current session
              revocation signs you out here.
            </p>
          </div>
          <div>
            {!sessions ? (
              <Loading label="Loading sessions…" />
            ) : (
              sessions.map((session) => (
                <div className="qb-session" key={session.id}>
                  <Monitor size={21} />
                  <div>
                    <strong>
                      {session.current
                        ? "This session"
                        : "Another signed-in session"}
                    </strong>
                    <small>
                      Started {date(session.createdAt)} · Expires{" "}
                      {date(session.expiresAt)}
                    </small>
                  </div>
                  {session.current && <Tag>Current</Tag>}
                  <Button
                    variant="quiet"
                    disabled={busy}
                    onClick={() => revoke(session)}
                  >
                    Revoke
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>
        <section className="qb-danger-zone">
          <div>
            <h2>Delete your account</h2>
            <p>
              This permanently removes your account and owned data. It cannot be
              undone.
            </p>
          </div>
          <div>
            {deleting ? (
              <form onSubmit={deleteAccount}>
                <Field label="Confirm your password">
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </Field>
                <label className="qb-check">
                  <input type="checkbox" required />
                  <span>
                    I understand my account and owned data will be deleted.
                  </span>
                </label>
                <div className="qb-inline-actions">
                  <Button variant="danger" type="submit" disabled={busy}>
                    Delete my account permanently
                  </Button>
                  <Button
                    variant="quiet"
                    type="button"
                    onClick={() => setDeleting(false)}
                  >
                    Keep my account
                  </Button>
                </div>
              </form>
            ) : (
              <Button variant="secondary" onClick={() => setDeleting(true)}>
                <Trash2 size={16} />
                Delete account
              </Button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
