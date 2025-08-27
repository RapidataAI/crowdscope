'use client';

import Link from "next/link";
import { useAuth } from "react-oidc-context";

export default function Home() {
  const auth = useAuth();

  return (
    <main className="min-h-screen bg-white">
      {/* Auth Header */}
      <div className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-lg font-semibold text-gray-900">
                CrowdScope
              </Link>
              {auth.user && (
                <nav className="flex gap-4">
                  <Link href="/signals" className="text-gray-600 hover:text-gray-900">
                    Signals
                  </Link>
                </nav>
              )}
            </div>
            <div className="flex items-center gap-4">
              {auth.user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    Welcome, {auth.user.profile?.name || auth.user.profile?.email}
                  </span>
                  <button
                    onClick={() => auth.signoutRedirect()}
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => auth.signinRedirect()}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            CrowdScope
          </h1>
          
          <h2 className="text-xl md:text-2xl text-gray-600 mb-12">
            Track trends and insights in population groups over time
          </h2>

          {/* Image Placeholder */}
          <div className="bg-gray-100 rounded-lg p-16 mb-12">
            <div className="text-gray-500 text-lg">
              📊 Survey Visualization Coming Soon
            </div>
          </div>

          {/* Description */}
          <div className="text-left max-w-3xl mx-auto space-y-6 text-gray-700">
            <p className="text-lg leading-relaxed">
              CrowdScope enables you to create <strong>signals</strong> - automated survey campaigns that run daily to capture real human insights. 
              Track how public opinion changes over time on topics that matter to you.
            </p>
            
            <p className="text-lg leading-relaxed">
              Whether you want to understand Bitcoin sentiment, political preferences, or consumer behavior, 
              CrowdScope collects authentic responses from real people and visualizes trends you won't find anywhere else.
            </p>

            <p className="text-lg leading-relaxed">
              Set your question, choose your answer options, specify how many responses you want daily, 
              and watch as patterns emerge from the crowd.
            </p>
          </div>

          {/* CTA Section */}
          <div className="mt-12 pt-8 border-t border-gray-200">
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
    </main>
  )
}
