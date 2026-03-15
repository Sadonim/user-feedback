"use client";

import { useSearchParams } from "next/navigation";
import { TrackingView } from "./TrackingView";

export function TrackingViewWrapper() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") ?? "";
  return <TrackingView initialId={initialId} />;
}
