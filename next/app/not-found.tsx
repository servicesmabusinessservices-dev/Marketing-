import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-6">
      <div className="max-w-xl text-center space-y-4">
        <p className="text-sky-300 text-sm uppercase tracking-[0.2em]">404</p>
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="text-slate-200">
          The link you followed doesn’t exist. Try returning home or reviewing our policies.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/" className="px-4 py-2 rounded-full bg-sky-400 text-slate-950 font-semibold">
            Go home
          </Link>
          <Link href="/privacy" className="px-4 py-2 rounded-full border border-slate-600">
            Privacy
          </Link>
          <Link href="/terms" className="px-4 py-2 rounded-full border border-slate-600">
            Terms
          </Link>
          <Link href="/security" className="px-4 py-2 rounded-full border border-slate-600">
            Security
          </Link>
        </div>
      </div>
    </main>
  );
}
