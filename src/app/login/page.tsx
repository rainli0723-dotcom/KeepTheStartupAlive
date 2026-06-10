import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-forms";
import { getCurrentAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const auth = await getCurrentAuth();
  if (auth) redirect("/enterprise");

  return (
    <main className="app-canvas grid min-h-screen place-items-center px-4 py-10 text-[var(--foreground)]">
      <AuthForm mode="login" />
    </main>
  );
}
