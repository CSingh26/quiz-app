import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/study/providers";
export const metadata: Metadata = {
  title: {
    default: "QuizBee — Make knowledge your own",
    template: "%s · QuizBee",
  },
  description:
    "A thoughtful workspace for private practice quizzes, source-grounded study, and instructor assessments.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
