"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function TrialBanner() {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/enterprise/usage")
      .then(r => r.json())
      .then(data => {
        setPlan(data.plan || "trial");
        if (data.trialEndsAt && data.plan === "trial") {
          const days = Math.ceil((new Date(data.trialEndsAt).getTime() - Date.now()) / 86400000);
          setDaysLeft(days);
        }
      })
      .catch(() => {});
  }, []);

  // Don't show anything for paid plans or if not loaded yet
  if (!plan || (plan !== "trial")) return null;
  if (daysLeft === null) return null;
  // Only show when <= 7 days left or expired
  if (daysLeft > 7) return null;

  const expired = daysLeft <= 0;

  return (
    <div className={`px-4 py-2.5 text-center text-sm font-semibold ${expired ? "bg-rose-500/15 text-rose-200 border-b border-rose-400/25" : "bg-amber-500/12 text-amber-200 border-b border-amber-400/25"}`}>
      {expired
        ? "⚠️ 试用期已到期，新建工作区和模拟功能已暂停。"
        : `⏰ 试用期还有 ${daysLeft} 天到期。`}
      {" "}
      <Link href="/pricing" className="underline decoration-1 underline-offset-2 font-bold hover:no-underline">
        {expired ? "升级为企业版 →" : "查看方案 →"}
      </Link>
    </div>
  );
}
