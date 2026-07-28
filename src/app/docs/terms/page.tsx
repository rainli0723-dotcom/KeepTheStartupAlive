import { readFileSync } from "fs";
import { join } from "path";
import Link from "next/link";

export default function TermsPage() {
  const content = readFileSync(
    join(process.cwd(), "docs", "terms-of-service.md"),
    "utf-8"
  );

  return (
    <main className="min-h-screen bg-[#05080f] text-white">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <nav className="mb-8">
          <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
            ← 返回首页
          </Link>
        </nav>
        <article className="prose prose-invert prose-cyan max-w-none">
          <div className="whitespace-pre-wrap font-mono text-sm leading-7 text-slate-300">
            {content}
          </div>
        </article>
      </div>
    </main>
  );
}
