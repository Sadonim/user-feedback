"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { FeedbackType, TicketStatus } from "@/types";

interface StatusHistoryEntry {
  id: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  note: string | null;
  createdAt: string;
}

interface TrackingData {
  trackingId: string;
  type: FeedbackType;
  status: TicketStatus;
  title: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusHistoryEntry[];
}

const STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CLOSED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const TYPE_LABELS: Record<FeedbackType, string> = {
  BUG: "🐛 Bug",
  FEATURE: "✨ Feature",
  GENERAL: "💬 General",
};

interface TrackingViewProps {
  initialId?: string;
}

export function TrackingView({ initialId = "" }: TrackingViewProps) {
  const [trackingId, setTrackingId] = useState(initialId);
  const [data, setData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    const id = trackingId.trim().toUpperCase();
    if (!id) return;

    setIsLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/v1/feedback/${id.toLowerCase()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setData(null);
        if (res.status === 404) {
          toast.error("No feedback found with that tracking ID.");
        } else {
          toast.error(json.error ?? "Something went wrong.");
        }
        return;
      }

      setData(json.data);
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Track Your Feedback</CardTitle>
          <CardDescription>Enter your tracking ID to check the status.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="FB-xxxxxxxx"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              className="font-mono"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Searching..." : "Track"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {searched && !isLoading && !data && (
        <p className="text-center text-sm text-muted-foreground">
          No feedback found. Double-check your tracking ID.
        </p>
      )}

      {data && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">{data.title}</CardTitle>
                <CardDescription className="mt-1 font-mono text-xs">
                  {data.trackingId}
                </CardDescription>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[data.status]}`}
              >
                {data.status.replace("_", " ")}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{TYPE_LABELS[data.type]}</span>
              <span>·</span>
              <span>Submitted {new Date(data.createdAt).toLocaleDateString()}</span>
            </div>

            {data.statusHistory.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="mb-3 text-sm font-medium">Status History</p>
                  <ol className="space-y-3">
                    {data.statusHistory.map((entry) => (
                      <li key={entry.id} className="flex gap-3 text-sm">
                        <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <div>
                          <p className="font-medium">
                            {entry.fromStatus
                              ? `${entry.fromStatus.replace("_", " ")} → ${entry.toStatus.replace("_", " ")}`
                              : entry.toStatus.replace("_", " ")}
                          </p>
                          {entry.note && (
                            <p className="text-muted-foreground">{entry.note}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
