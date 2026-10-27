import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <EmptyState
        title="Page not found"
        description="The page you're looking for doesn't exist."
        action={
          <Button asChild>
            <Link href="/">Back to Today</Link>
          </Button>
        }
      />
    </main>
  );
}
