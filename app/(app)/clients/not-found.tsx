import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function ClientNotFound() {
  return (
    <EmptyState
      title="Client not found"
      description="This client may have been deleted, or the link is wrong."
      action={
        <Button asChild>
          <Link href="/clients">Back to clients</Link>
        </Button>
      }
    />
  );
}
