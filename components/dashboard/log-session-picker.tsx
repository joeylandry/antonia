"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
      <Select
        aria-label="Client to log a session for"
        value={id}
        onChange={(e) => {
          setId(e.target.value);
          if (e.target.value) router.push(`/clients/${e.target.value}/sessions/new`);
        }}
        className="sm:w-64"
      >
        <option value="">Log a session for…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
    </form>
  );
}
