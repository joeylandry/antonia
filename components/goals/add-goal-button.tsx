"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoalDialog } from "./goal-dialog";

export function AddGoalButton({ clientId, exerciseNames, label = "Add goal", variant = "primary" }: { clientId: string; exerciseNames: string[]; label?: string; variant?: "primary" | "secondary" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        <Plus /> {label}
      </Button>
      <GoalDialog clientId={clientId} exerciseNames={exerciseNames} open={open} onOpenChange={setOpen} />
    </>
  );
}
