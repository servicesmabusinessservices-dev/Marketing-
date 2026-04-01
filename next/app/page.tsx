import Link from "next/link";

const heroPoints = [
  "Verified Gmail OAuth scopes (readonly, modify, send) with zero body storage.",
  "Multi-account inbox control with shared labels and guardrails.",
  "Bulk unsubscribe and outreach actions with audit trails.",
];

export default function Home() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center px-6 py-16"
    >
      <div className="w-full max-w-5xl grid gap-12">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr] items-center">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.2em] text-sky-300">
              Gmail Manager
            </p>
            <h1 className="text-4xl sm:text-5xl font-semibold leading-tight">
              Multi-account Gmail control with compliant OAuth and real product proof.
            </h1>
            <p className="text-lg text-slate-200">
              Connect inboxes securely, automate triage, and launch outreach from one workspace.
              Built for teams that need privacy-first email automation.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/connect"
                className="rounded-full bg-sky-400 px-5 py-3 text-slate-950 font-semibold shadow-lg shadow-sky-400/30 hover:bg-sky-300 transition"
              >
                Connect Gmail
              </Link>
              <Link
                href="/security"
                className="rounded-full border border-slate-500 px-5 py-3 text-slate-50 hover:border-slate-300 transition"
              >
                View security
              </Link>
            </div>
            <div className="grid gap-3 text-sm text-slate-200">
              {heroPoints.map((point) => (
                <div key={point} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-sky-300" aria-hidden />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-900/50">
            <div className="text-sm text-slate-300 mb-3">Preview</div>
            <div className="aspect-[4/3] rounded-xl border border-slate-800 bg-gradient-to-br from-slate-800 via-slate-900 to-black p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-200">
                <span>Inbox Control</span>
                <span className="rounded-full bg-emerald-500/20 text-emerald-200 px-2 py-1">
                  Protected
                </span>
              </div>
              <div className="grid gap-3 text-sm text-slate-100">
                <div className="rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-2 flex items-center justify-between">
                  <span>Account status</span>
                  <span className="text-emerald-300 font-semibold">Connected</span>
                </div>
                <div className="rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-2 flex items-center justify-between">
                  <span>Scopes</span>
                  <span className="text-sky-200">readonly · modify · send</span>
                </div>
                <div className="rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-2 flex items-center justify-between">
                  <span>Storage</span>
                  <span className="text-slate-200">No email bodies persisted</span>
                </div>
              </div>
              <div className="text-xs text-slate-400 text-right">
                OAuth verification ready · 24h deletion SLA
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <h2 className="text-2xl font-semibold">What’s inside</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Legal-ready",
                desc: "Server-rendered Privacy, Terms, and Security pages with crawlable metadata.",
                href: "/privacy",
              },
              {
                title: "Crawlable by design",
                desc: "SSR/SSG-first routing with sitemap and robots for Google and social previews.",
                href: "/security",
              },
              {
                title: "One real feature",
                desc: "Next step: bulk unsubscribe action wired to Gmail API with audit trail.",
                href: "/connect",
              },
            ].map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-600 transition"
              >
                <div className="text-lg font-semibold text-slate-50">{card.title}</div>
                <div className="text-sm text-slate-200 mt-2">{card.desc}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
