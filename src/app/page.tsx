'use client';

import Link from "next/link";
import { useAuth } from "react-oidc-context";
import { Header } from "@/components/Header";

export default function Home() {
  const auth = useAuth();

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />

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
