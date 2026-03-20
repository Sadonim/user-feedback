"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

/* TRK-07: separate emoji from text so SR doesn't read emoji descriptions */
const TYPE_EMOJI: Record<FeedbackType, string> = {
  BUG: "🐛",
  FEATURE: "✨",
  GENERAL: "💬",
};

const TYPE_TEXT: Record<FeedbackType, string> = {
  BUG: "버그",
  FEATURE: "기능 요청",
  GENERAL: "일반",
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
        /* TRK-05: only set state for the live region, skip toast on 404
           to avoid duplicate SR announcements */
        if (res.status !== 404) {
          toast.error(json.error ?? "오류가 발생했습니다.");
        }
        return;
      }

      setData(json.data);
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 연결 상태를 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>피드백 조회</CardTitle>
          <CardDescription>접수 번호를 입력하여 처리 상태를 확인하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            {/* TRK-01: explicit label association */}
            <Label htmlFor="tracking-id-input" className="sr-only">
              접수 번호
            </Label>
            <Input
              id="tracking-id-input"
              placeholder="FB-xxxxxxxx"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              className="font-mono"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "조회 중..." : "조회"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* TRK-03: aria-live region so SR hears results/not-found messages */}
      <div aria-live="polite" aria-atomic="false">
        {searched && !isLoading && !data && (
          <p className="text-center text-sm text-muted-foreground">
            피드백을 찾을 수 없습니다. 접수 번호를 다시 확인해주세요.
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
                {/* TRK-02: aria-label provides status text independently of color */}
                <span
                  aria-label={`Status: ${data.status.replace("_", " ")}`}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[data.status]}`}
                >
                  {data.status.replace("_", " ")}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 text-sm text-muted-foreground">
                {/* TRK-07: emoji hidden, plain text read by SR */}
                <span>
                  <span aria-hidden="true">{TYPE_EMOJI[data.type]}</span>
                  {' '}
                  <span>{TYPE_TEXT[data.type]}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span>제출일: {new Date(data.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>

              {data.statusHistory.length > 0 && (
                <>
                  <Separator />
                  <div>
                    {/* TRK-06: heading associated with the list via id/aria-labelledby */}
                    <p id="status-history-heading" className="mb-3 text-sm font-medium">
                      상태 변경 이력
                    </p>
                    <ol aria-labelledby="status-history-heading" className="space-y-3">
                      {data.statusHistory.map((entry) => (
                        <li key={entry.id} className="flex gap-3 text-sm">
                          {/* TRK-04: decorative bullet dot hidden from SR */}
                          <div
                            aria-hidden="true"
                            className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                          />
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
    </div>
  );
}
