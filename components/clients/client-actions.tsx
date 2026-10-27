"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, CalendarCheck, MoreHorizontal, Pencil, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { completeReviewAction, deleteClientAction, setArchivedAction } from "@/app/(app)/clients/actions";

export function ClientActions({ clientId, clientName, archived }: { clientId: string; clientName: string; archived: boolean }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | "archive" | "delete" | "review">(null);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const [weeks, setWeeks] = useState("6");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function archive() {
    setBusy(true);
    const r = await setArchivedAction(clientId, !archived);
    setBusy(false);
    setDialog(null);
    if (!r.ok) return void toast.error(r.error);
    toast.success(archived ? `${clientName} restored` : `${clientName} archived`);
    router.refresh();
    if (!archived) router.push("/clients");
  }

  async function review() {
    setBusy(true);
    const r = await completeReviewAction(clientId, weeks === "none" ? null : Number(weeks));
    setBusy(false);
    setDialog(null);
    if (!r.ok) return void toast.error(r.error);
    toast.success("Review recorded");
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    setDeleteError(null);
    const r = await deleteClientAction(clientId, typed);
    setBusy(false);
    if (!r.ok) return void setDeleteError(r.error ?? "Something went wrong.");
    setDialog(null);
    toast.success("Client deleted");
    router.push("/clients");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" aria-label="More actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/clients/${clientId}/edit`}>
              <Pencil /> Edit details
            </Link>
          </DropdownMenuItem>
          {!archived && (
            <DropdownMenuItem onSelect={() => setDialog("review")}>
              <CalendarCheck /> Mark review done
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <a href={`/clients/${clientId}/export`} download>
              <Download /> Export sessions (CSV)
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => (archived ? archive() : setDialog("archive"))}>
            {archived ? <ArchiveRestore /> : <Archive />} {archived ? "Restore client" : "Archive client"}
          </DropdownMenuItem>
          <DropdownMenuItem danger onSelect={() => { setTyped(""); setDeleteError(null); setDialog("delete"); }}>
            <Trash2 /> Delete permanently…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={dialog === "archive"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Archive ${clientName}?`}
        description="They'll be hidden from your client list and dashboard. Their sessions, goals and notes are kept, and you can restore them any time from Archived."
        confirmLabel="Archive"
        tone="primary"
        loading={busy}
        onConfirm={archive}
      />

      <ConfirmDialog
        open={dialog === "review"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Record this review"
        description="Marks the review as done today. Schedule the next one if you like."
        confirmLabel="Save"
        tone="primary"
        loading={busy}
        onConfirm={review}
      >
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="next-review">Next review</Label>
          <Select id="next-review" value={weeks} onChange={(e) => setWeeks(e.target.value)}>
            <option value="4">In 4 weeks</option>
            <option value="6">In 6 weeks</option>
            <option value="8">In 8 weeks</option>
            <option value="12">In 12 weeks</option>
            <option value="none">Don&apos;t schedule one</option>
          </Select>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Delete ${clientName} permanently?`}
        description="This erases the client and every session, goal, measurement and note. It can't be undone. If you might need the history later, archive instead."
        confirmLabel="Delete forever"
        loading={busy}
        onConfirm={remove}
      >
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="confirm-name">
            Type <span className="font-semibold text-foreground">{clientName}</span> to confirm
          </Label>
          <Input id="confirm-name" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" aria-invalid={!!deleteError} />
          {deleteError && <p role="alert" className="text-xs text-danger">{deleteError}</p>}
        </div>
      </ConfirmDialog>
    </>
  );
}
