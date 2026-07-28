import { NextResponse } from "next/server";
import { getJobStatus } from "@/lib/job-queue";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const status = await getJobStatus(id);
  if (!status) {
    return NextResponse.json({ error: "未找到该任务" }, { status: 404 });
  }
  return NextResponse.json(status);
}
