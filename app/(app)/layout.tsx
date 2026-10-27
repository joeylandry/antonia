import { AppShell } from "@/components/shell/app-shell";
import { isDemo } from "@/lib/demo/mode";
import { requireTrainer } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const trainer = await requireTrainer();
  return <AppShell trainer={trainer} demo={isDemo()}>{children}</AppShell>;
}
