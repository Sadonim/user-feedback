import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">User Feedback</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Submit feedback, track issues, and help us improve.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/submit"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Submit Feedback
        </Link>
        <Link
          href="/track"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Track Status
        </Link>
      </div>
    </main>
  );
}
