import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Connect Gmail | Gmail Manager",
  description: "Start the OAuth flow to connect your Gmail account.",
};

export default function Connect() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-6 py-16">
      <div className="max-w-2xl space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-sky-300">Step 1</p>
        <h1 className="text-3xl font-semibold">Connect your Gmail account</h1>
        <p className="text-slate-200">
          This page will initiate the Google OAuth 2.0 flow. We’ll request only the scopes needed:
          readonly, modify, and send. Tokens are encrypted at rest and email bodies are not stored.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full bg-sky-400 px-5 py-3 text-slate-950 font-semibold shadow-lg shadow-sky-400/30 hover:bg-sky-300 transition"
          >
            Launch OAuth (stub)
          </button>
          <Link
            href="/security"
            className="rounded-full border border-slate-600 px-5 py-3 text-slate-50 hover:border-slate-300 transition"
          >
            Review scopes
          </Link>
        </div>
        <p className="text-sm text-slate-300">
          Next: wire this CTA to the backend OAuth endpoint and handle the callback at
          <code className="ml-1">/auth/callback</code>.
        </p>
      </div>
    </main>
  );
}
