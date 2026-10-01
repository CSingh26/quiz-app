import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  FileText,
  LockKeyhole,
  PencilLine,
} from "lucide-react";
import { Brand } from "@/components/study/ui";
export default function Landing() {
  return (
    <div className="qb qb-landing">
      <a className="qb-skip" href="#main-content">
        Skip to content
      </a>
      <header className="qb-public-header">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <Link href="/study/login">Sign in</Link>
          <Link href="/study/register" className="qb-button qb-button-primary">
            Start studying <ArrowUpRight size={17} />
          </Link>
        </nav>
      </header>
      <main id="main-content">
        <section className="qb-hero">
          <div className="qb-hero-copy">
            <h1>
              Don’t just read it.
              <br />
              <em>Make it yours.</em>
            </h1>
            <p>
              Turn what you’re learning into questions worth asking. Build your
              own quizzes, practice with purpose, and see what sticks.
            </p>
            <div className="qb-hero-actions">
              <Link
                className="qb-button qb-button-primary qb-button-large"
                href="/study/register"
              >
                Find your study rhythm <ArrowRight size={19} />
              </Link>
              <Link className="qb-text-link" href="/study/login">
                Back to your desk
              </Link>
            </div>
            <div className="qb-hero-footnote">
              <LockKeyhole size={15} />
              Your quizzes are private. Your progress is yours.
            </div>
          </div>
          <div
            className="qb-hero-art"
            aria-label="An example practice question"
          >
            <div className="qb-example-tab">
              <BookOpen size={16} /> A little practice, a lasting idea.
            </div>
            <div className="qb-example-sheet">
              <div className="qb-example-meta">
                <span>Example practice</span>
                <span>01 / 03</span>
              </div>
              <h2>
                What makes a new idea
                <br />
                easier to remember?
              </h2>
              <div className="qb-example-option">
                Reading the same page again
              </div>
              <div className="qb-example-option selected">
                <span>Recalling it in your own words</span>
                <Check size={19} />
              </div>
              <div className="qb-example-option">
                Highlighting every sentence
              </div>
              <div className="qb-example-note">
                <span>Room to think.</span>
                <p>
                  One question at a time.
                  <br />A little clearer with every attempt.
                </p>
              </div>
            </div>
            <div className="qb-book-spines" aria-hidden="true">
              <span>Curiosity</span>
              <span>Practice</span>
              <span>Understanding</span>
            </div>
          </div>
        </section>
        <section className="qb-landing-workflow" id="how-it-works">
          <div>
            <h2>
              A good place
              <br />
              to grow what you know.
            </h2>
            <p>
              From the first question to your next breakthrough, keep the work
              of learning in one thoughtful space.
            </p>
          </div>
          <div className="qb-workflow-list">
            <article>
              <PencilLine size={23} />
              <div>
                <h3>Put your knowledge into questions</h3>
                <p>
                  Write a private quiz with the question types your subject
                  needs. Save a new version whenever your understanding changes.
                </p>
              </div>
            </article>
            <article>
              <FileText size={23} />
              <div>
                <h3>Keep your sources close</h3>
                <p>
                  Organize study materials and inspect extracted passages. With
                  an AI provider configured, create drafts grounded in those
                  sources.
                </p>
              </div>
            </article>
            <article>
              <BookOpen size={23} />
              <div>
                <h3>Practice, pause, come back</h3>
                <p>
                  Answers save as you work. Resume an attempt, review released
                  explanations, and choose what to revisit next.
                </p>
              </div>
            </article>
          </div>
        </section>
        <section className="qb-instructor-banner">
          <div>
            <h2>Teaching a room full of curious minds?</h2>
            <p>
              Create a course, share an assignment, and bring real results into
              the next conversation.
            </p>
          </div>
          <Link
            className="qb-button qb-button-secondary"
            href="/study/register?role=instructor"
          >
            Create an instructor account <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <footer className="qb-public-footer">
        <Brand />
        <span>Made for the way you learn.</span>
        <Link href="/study/login">
          Open your workspace <ArrowUpRight size={15} />
        </Link>
      </footer>
    </div>
  );
}
