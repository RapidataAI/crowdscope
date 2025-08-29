"use client";

import Link from "next/link";
import { useAuth } from "react-oidc-context";
import { Header } from "@/components/Header";

export default function Home() {
  const auth = useAuth();
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-20 gradient-primary" />
          <div className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-20 gradient-primary" />
        </div>
        <div className="container mx-auto px-6 pt-16 pb-10">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="relative z-[1]">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-sm mb-5 dark:bg-white/5 dark:border-white/10 dark:text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-cyan-400" />
                Real people. Global reach. Daily runs.
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance text-gray-900 dark:text-white">
                Global signals, real-time insights
              </h1>
              <p className="mt-5 text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl">
                CrowdScope lets you launch recurring, programmatic surveys and watch trends evolve. Capture authentic sentiment from diverse audiences and turn it into clear, actionable signals.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                {auth.user ? (
                  <>
                    <Link href="/signals/create" className="btn-primary">Launch a signal</Link>
                    <Link href="/signals" className="btn-secondary dark:btn-ghost">View dashboard</Link>
                  </>
                ) : (
                  <>
                    <button onClick={() => auth.signinRedirect()} className="btn-primary">Sign in to get started</button>
                    <Link href="/signals" className="btn-secondary dark:btn-ghost">Explore signals</Link>
                  </>
                )}
              </div>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="badge-neutral">Automated daily runs</div>
                <div className="badge-neutral">Programmatic survey workflow</div>
                <div className="badge-neutral">Trends over time</div>
              </div>
            </div>

            {/* Illustration */}
            <div className="relative z-[1]">
              <div className="card p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Example signal</p>
                    <p className="font-medium text-gray-900 dark:text-white">Bitcoin sentiment (Daily)</p>
                  </div>
                  <div className="badge-success">Live</div>
                </div>
                <div className="h-56 w-full rounded-lg bg-gradient-to-b from-blue-50 to-white border border-gray-200 dark:from-white/10 dark:to-white/0 dark:border-white/10 flex items-end p-4">
                  {/* Mini stacked area chart (static svg) */}
                  <svg viewBox="0 0 600 180" className="w-full h-full">
                    <defs>
                      <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                      </linearGradient>
                      <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
                      </linearGradient>
                      <linearGradient id="g3" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    <g>
                      <g stroke="#e5e7eb" strokeWidth="1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <line key={i} x1="0" x2="600" y1={30 + i * 30} y2={30 + i * 30} />
                        ))}
                      </g>
                      <path d="M0 140 C 60 120, 120 140, 180 130 S 300 120, 360 135 480 110, 540 125 600 120 600 180 0 180 Z" fill="url(#g1)" />
                      <path d="M0 150 C 60 135, 120 140, 180 150 S 300 145, 360 150 480 140, 540 145 600 150 600 180 0 180 Z" fill="url(#g2)" />
                      <path d="M0 160 C 60 150, 120 155, 180 160 S 300 160, 360 162 480 158, 540 160 600 162 600 180 0 180 Z" fill="url(#g3)" />
                    </g>
                  </svg>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div className="card p-3">
                    <p className="text-gray-500 dark:text-gray-400">Positive</p>
                    <p className="text-gray-900 dark:text-white font-semibold">48%</p>
                  </div>
                  <div className="card p-3">
                    <p className="text-gray-500 dark:text-gray-400">Neutral</p>
                    <p className="text-gray-900 dark:text-white font-semibold">28%</p>
                  </div>
                  <div className="card p-3">
                    <p className="text-gray-500 dark:text-gray-400">Negative</p>
                    <p className="text-gray-900 dark:text-white font-semibold">24%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-8">
            <h2 className="section-header">Why CrowdScope</h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg">Purpose-built to collect clear, consistent signals from real people at scale — with a workflow that stays out of your way.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card p-6">
              <div className="w-10 h-10 rounded-lg gradient-primary mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M9 3v4M15 3v4M4 9h16v10a2 2 0 01-2 2H6a2 2 0 01-2-2V9z"/></svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Programmatic surveys</h3>
              <p className="text-gray-600 dark:text-gray-300">Define your question and answer options once. Schedule recurring runs and let automation do the rest.</p>
            </div>
            <div className="card p-6">
              <div className="w-10 h-10 rounded-lg gradient-primary mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 1118 0z"/></svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Global audience</h3>
              <p className="text-gray-600 dark:text-gray-300">Reach diverse populations across the world to observe how sentiment shifts between groups and regions.</p>
            </div>
            <div className="card p-6">
              <div className="w-10 h-10 rounded-lg gradient-primary mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 3v6h6M21 21v-6h-6M21 3h-6m6 0v6M3 21h6m-6 0v-6"/></svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Trends over time</h3>
              <p className="text-gray-600 dark:text-gray-300">See trajectories, not snapshots. Compare runs and spot inflection points with clear visualizations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white dark:bg-white/5 border-t border-b border-gray-200 dark:border-white/10">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-7xl mx-auto">
            <h2 className="section-header mb-6">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6">
                <div className="badge-neutral mb-3">Step 1</div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Create a signal</h3>
                <p className="text-gray-600 dark:text-gray-300">Write a clear question, set answer options, and choose your daily response target.</p>
              </div>
              <div className="card p-6">
                <div className="badge-neutral mb-3">Step 2</div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Collect responses</h3>
                <p className="text-gray-600 dark:text-gray-300">CrowdScope executes runs on schedule and gathers responses from real people.</p>
              </div>
              <div className="card p-6">
                <div className="badge-neutral mb-3">Step 3</div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Track the trend</h3>
                <p className="text-gray-600 dark:text-gray-300">Compare results across days and watch sentiment move with clean, consistent charts.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Example templates */}
      <section className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="section-header">Popular use cases</h2>
              <p className="text-gray-600 dark:text-gray-300">Kickstart with simple templates and adapt to your needs.</p>
            </div>
            {auth.user ? (
              <Link href="/signals/create" className="btn-secondary dark:btn-ghost">New signal</Link>
            ) : null}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[ 
              { title: 'Bitcoin sentiment', a: ['Bullish', 'Neutral', 'Bearish'] },
              { title: 'Brand preference', a: ['A', 'B', 'Other'] },
              { title: 'Policy support', a: ['Support', 'Unsure', 'Oppose'] },
            ].map((t, i) => (
              <div key={i} className="card p-6 hover:shadow-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">{t.title}</h3>
                <div className="space-y-2">
                  {t.a.map((opt, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#3b82f6','#f59e0b','#10b981'][j] }} />
                      <span className="text-gray-700 dark:text-gray-300 flex-1">{opt}</span>
                      <div className="h-2 bg-gray-100 dark:bg-white/10 rounded w-40">
                        <div className="h-2 rounded" style={{ width: `${[48,28,24][j]}%`, backgroundColor: ['#3b82f6','#f59e0b','#10b981'][j] }} />
                      </div>
                      <span className="text-gray-900 dark:text-white font-medium w-12 text-right">{[48,28,24][j]}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-6 pb-16">
        <div className="max-w-7xl mx-auto text-center">
          <div className="card p-8 md:p-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-3">Start listening to the crowd</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Create your first signal in minutes and turn responses into a living trendline.</p>
            {auth.user ? (
              <Link href="/signals/create" className="btn-primary">Create a signal</Link>
            ) : (
              <button onClick={() => auth.signinRedirect()} className="btn-primary">Sign in to create a signal</button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
