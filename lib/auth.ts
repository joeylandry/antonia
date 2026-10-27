import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { withTrainer } from "@/lib/db/client";
import { DEMO_TRAINER, isDemo } from "@/lib/demo/mode";
import { profile as demoProfile } from "@/lib/demo/store";

export type Trainer = {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
};

/**
 * The signed-in trainer, or null. Identity is verified with the auth server
 * (getUser), never taken from an unverified cookie.
 */
export const getTrainer = cache(async (): Promise<Trainer | null> => {
  if (isDemo()) return { ...DEMO_TRAINER, displayName: demoProfile().displayName, timezone: demoProfile().timezone };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const user = data.user;
  const rows = await withTrainer(
    user.id,
    (tx) => tx<{ display_name: string; timezone: string }[]>`select display_name, timezone from public.trainers where id = ${user.id}`,
  );
  const profile = rows[0];
  if (!profile) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    displayName: profile.display_name,
    timezone: profile.timezone,
  };
});

/** Use at the top of every page, layout, and server action that touches client data. */
export async function requireTrainer(): Promise<Trainer> {
  const trainer = await getTrainer();
  if (!trainer) redirect("/login");
  return trainer;
}
