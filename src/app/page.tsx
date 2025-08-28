'use client';

import Link from "next/link";
import { useAuth } from "react-oidc-context";
import { Header } from "@/components/Header";

export default function Home() {
  const auth = useAuth();

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Use consistent Header component when authenticated */}
      {auth.user ? (
        <Header />
      ) : (
        /* Custom header for unauthenticated users */
        <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center gap-3 group">
                  <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <span className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                    CrowdScope
                  </span>
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => auth.signinRedirect()}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            {/* Hero Section */}
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              CrowdScope
            </h1>
            
            <h2 className="text-xl md:text-2xl text-gray-600 mb-12">
              Track trends and insights in population groups over time
            </h2>

            {/* Image Placeholder */}
            <div className="card mb-12">
              <div className="p-16 text-center">
                <div className="text-gray-500 text-lg">
                  📊 Survey Visualization Coming Soon
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="card mb-12">
              <div className="p-8 text-left space-y-6 text-gray-700">
                <p className="text-lg leading-relaxed">
                  CrowdScope enables you to create <strong>signals</strong> - automated survey campaigns that run daily to capture real human insights. 
                  Track how public opinion changes over time on topics that matter to you.
                </p>
                
                <p className="text-lg leading-relaxed">
                  Whether you want to understand Bitcoin sentiment, political preferences, or consumer behavior, 
                  CrowdScope collects authentic responses from real people and visualizes trends you won&apos;t find anywhere else.
                </p>

                <p className="text-lg leading-relaxed">
                  Set your question, choose your answer options, specify how many responses you want daily, 
                  and watch as patterns emerge from the crowd.
                </p>
              </div>
            </div>

            {/* CTA Section */}
            <div className="card">
              <div className="p-8 text-center">
                {auth.user ? (
                  <div className="space-y-4">
                    <p className="text-gray-600 text-lg">
                      Ready to create your first signal?
                    </p>
                    <Link
                      href="/signals"
                      className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
                    >
                      Go to Signals Dashboard
                    </Link>
                  </div>
                ) : (
                  <p className="text-gray-600 text-lg">
                    Sign in to start creating signals and tracking crowd insights
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
