import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "@/components/auth-forms";
import { getCurrentAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const auth = await getCurrentAuth();
  if (auth) redirect("/enterprise");

  return (
    <main className="app-canvas flex min-h-screen items-center justify-center px-4 py-10 text-[var(--foreground)]">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-4 inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-white/[0.08]">
          返回首页
        </Link>
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
