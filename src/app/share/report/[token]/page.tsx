import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { buildEnterpriseReportMarkdown } from "@/lib/report-export";
import { getReportPayload } from "@/lib/report-payload";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const share = await getDb().reportShareLink.findUnique({ where: { tokenHash } });
  if (!share || share.status !== "active" || share.revokedAt || (share.expiresAt && share.expiresAt < new Date())) notFound();

  const payload = await getReportPayload(share.finaleId);
  if (!payload) notFound();

  const markdown = buildEnterpriseReportMarkdown(payload);

  return (
    <main className="min-h-screen bg-[#05080f] px-4 py-10 text-white sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl rounded-lg border border-white/10 bg-white/[0.035] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Read-only KTSA report</p>
        <h1 className="mt-3 text-3xl font-semibold">{payload.finale.title}</h1>
        <p className="mt-2 text-sm text-slate-400">{payload.organization?.name ?? "Enterprise customer"}</p>
        <pre className="mt-6 whitespace-pre-wrap rounded-md border border-white/10 bg-black/25 p-4 text-sm leading-6 text-slate-200">{markdown}</pre>
      </article>
    </main>
  );
}
