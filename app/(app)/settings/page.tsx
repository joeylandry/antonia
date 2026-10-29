import type { Metadata } from "next";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/settings/profile-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { requireTrainer } from "@/lib/auth";
import { signOutAction } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Settings" };

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 py-8 first:pt-0 md:grid-cols-[14rem_1fr] md:gap-10">
      <div>
        <h2 className="font-display text-lg font-medium">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="max-w-md">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const trainer = await requireTrainer();
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" />
      <div className="divide-y divide-border">
        <Section title="Profile">
          <ProfileForm displayName={trainer.displayName} timezone={trainer.timezone} />
        </Section>
        <Section title="Appearance" description="Saved on this device. “System” follows your device setting.">
          <ThemeToggle />
        </Section>
        <Section title="Passcode">
          <p className="text-sm text-muted-foreground">
            The passcode is set on the server, not here. To change it, run <code className="font-mono text-foreground">npm run passcode</code>, put the
            new <code className="font-mono text-foreground">PASSCODE_HASH</code> in place of the old one and restart the app. Every device is then signed out.
          </p>
        </Section>
        <Section title="Your data" description="Download a complete copy of every client, session, goal, measurement and note as JSON. Per-client CSV export is in each client's ⋯ menu.">
          <Button asChild variant="secondary">
            <a href="/settings/export" download>
              <Download /> Download all data
            </a>
          </Button>
        </Section>
        <Section title="Session">
          <form action={signOutAction}>
            <Button type="submit" variant="secondary">
              Sign out
            </Button>
          </form>
        </Section>
      </div>
    </div>
  );
}
