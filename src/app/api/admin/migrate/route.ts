import { execSync } from "child_process";
import { NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth";

export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth || auth.user.role !== "admin") {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  // Only allow in development or with explicit env flag
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_MIGRATE !== "true") {
    return NextResponse.json({ error: "生产环境不允许通过 API 执行迁移" }, { status: 403 });
  }

  try {
    const output = execSync(
      "npx prisma migrate deploy --schema prisma-postgres/schema.prisma",
      { encoding: "utf-8", timeout: 30000, env: { ...process.env } }
    );
    return NextResponse.json({ ok: true, output });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message, stderr: error.stderr },
      { status: 500 }
    );
  }
}
