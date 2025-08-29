'use client';

import Link from "next/link";
import { useAuth } from "react-oidc-context";

export function Header() {
  const auth = useAuth();
  const isAuthenticated = !!auth.user;
  const displayName = auth.user?.profile?.name || auth.user?.profile?.email || '';
  const initial = isAuthenticated ? (displayName?.charAt(0)?.toUpperCase() || '?') : '';


  return (
    <header className={`bg-white/80 dark:bg-[#0b1020]/70 backdrop-blur-lg border-b border-gray-200 dark:border-white/10 sticky top-0 z-50`}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className={`w-8 h-8 gradient-primary rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200`}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className={`text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors duration-200`}>
                CrowdScope
              </span>
            </Link>
            <nav className="hidden sm:flex">
              <Link 
                href="/signals" 
                className={`px-4 py-2 font-medium rounded-lg transition-all duration-200 text-gray-700 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-200 dark:hover:text-white dark:hover:bg-white/5`}
              >
                Signals
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme toggle removed: using system preference only */}
            {isAuthenticated && (
              <div className="hidden sm:flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-green-100 dark:bg-emerald-900/40 border border-transparent dark:border-emerald-500/30`}>
                  <span className={`text-green-700 dark:text-emerald-300 font-medium text-sm`}>{initial}</span>
                </div>
                <span className={`text-sm text-gray-600 dark:text-gray-300`}>{displayName}</span>
              </div>
            )}
            {isAuthenticated ? (
              <button
                onClick={() => auth.signoutRedirect()}
                className={`text-sm px-3 py-2 rounded-lg transition-all duration-200 text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200 hover:text-gray-900 hover:border-gray-300 dark:text-gray-200 dark:bg-transparent dark:hover:bg-white/10 dark:border-white/10`}
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => auth.signinRedirect()}
                className={`text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-sm px-3 py-2 rounded-lg transition-all duration-200`}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
