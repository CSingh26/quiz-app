import { StudyShell } from "@/components/study/shell";
export default function StudyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudyShell>{children}</StudyShell>;
}
