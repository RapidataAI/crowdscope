'use client';

import Link from "next/link";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export function Header() {
  const { displayName, signOut } = useRequireAuth();

  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
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
            <nav className="hidden sm:flex">
              <Link 
                href="/signals" 
                className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-all duration-200"
              >
                Signals
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-700 font-medium text-sm">
                  {displayName?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-gray-600">
                {displayName}
              </span>
            </div>
            <button
              onClick={signOut}
              className="text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}