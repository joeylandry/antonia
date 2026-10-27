"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

export function LogSessionPicker({ clients }: { clients: { id: string; name: string }[] }) {
  const router = useRouter();
  const [id, setId] = useState("");
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (id) router.push(`/clients/${id}/sessions/new`);
      }}
    >
      <Select aria-label="Client to log a session for" value={id} onChange={(e) => setId(e.target.value)} className="sm:w-64">
        <option value="">Choose a client…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Button type="submit" disabled={!id}>
        <Dumbbell /> Log session
      </Button>
    </form>
  );
}
