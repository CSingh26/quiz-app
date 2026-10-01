"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import {
  BookOpen,
  Files,
  FolderOpen,
  Home,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { api, ApiError, message, send, type User } from "@/lib/platform-api";
import { Brand, Button, ErrorMessage, Loading } from "./ui";
const UserContext = createContext<User | null>(null);
export function useUser() {
  return useContext(UserContext);
}
const links = [
  { href: "/study", label: "Overview", icon: Home },
  { href: "/study/quizzes", label: "My quizzes", icon: BookOpen },
  { href: "/study/banks", label: "Question banks", icon: FolderOpen },
  { href: "/study/materials", label: "Study materials", icon: Files },
  { href: "/study/generate", label: "Generate a quiz", icon: Sparkles },
  { href: "/study/courses", label: "Courses", icon: Users },
];
export function StudyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const publicPage = [
    "/study/login",
    "/study/register",
    "/study/forgot-password",
    "/study/reset-password",
    "/study/verify",
  ].includes(pathname);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (publicPage) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    api<{ user: User }>("/auth/me")
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401)
          router.replace(`/study/login?next=${encodeURIComponent(pathname)}`);
        else setError(message(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [publicPage, router, pathname]);
  if (publicPage) return <div className="qb qb-auth-root">{children}</div>;
  if (loading || !user)
    return (
      <div className="qb qb-shell-loading">
        <Brand />
        {error ? (
          <ErrorMessage retry={() => window.location.reload()}>
            {error}
          </ErrorMessage>
        ) : (
          <Loading />
        )}
      </div>
    );
  const logout = async () => {
    try {
      await send("/auth/logout");
      setUser(null);
      router.replace("/study/login");
    } catch (error) {
      setError(message(error));
    }
  };
  return (
    <UserContext.Provider value={user}>
      <div className="qb qb-workspace">
        <a className="qb-skip" href="#main-content">
          Skip to content
        </a>
        <header className="qb-mobile-header">
          <Brand />
          <Button
            variant="quiet"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </header>
        <aside className={`qb-sidebar ${open ? "is-open" : ""}`}>
          <div className="qb-sidebar-brand">
            <Brand />
          </div>
          <div className="qb-workspace-label">Your study desk</div>
          <nav aria-label="Study navigation">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={
                  (
                    href === "/study"
                      ? pathname === href
                      : pathname.startsWith(href)
                  )
                    ? "page"
                    : undefined
                }
              >
                <Icon size={19} strokeWidth={1.65} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="qb-sidebar-bottom">
            <Link
              className="qb-settings-link"
              href="/study/settings"
              aria-current={pathname === "/study/settings" ? "page" : undefined}
            >
              <Settings size={18} />
              Settings
            </Link>
            <div className="qb-user">
              <span className="qb-avatar">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{user.name}</strong>
                <small>
                  {user.role === "STUDENT"
                    ? "Personal workspace"
                    : "Instructor workspace"}
                </small>
              </div>
              <button onClick={logout} aria-label="Sign out">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </aside>
        <main
          id="main-content"
          className={`qb-main ${pathname.includes("/attempts/") ? "qb-main-attempt" : ""}`}
          tabIndex={-1}
        >
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {children}
          <footer className="qb-workspace-footer">
            <span>Made for the way you learn.</span>
            <span>QuizBee · Your knowledge, growing.</span>
          </footer>
        </main>
      </div>
    </UserContext.Provider>
  );
}
