'use client';

import Link from "next/link";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export function Header() {
  const { displayName, signOut } = useRequireAuth();

  return (
    <div className="border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-semibold text-gray-900">
              CrowdScope
            </Link>
            <nav className="flex gap-4">
              <Link href="/signals" className="text-blue-600 font-medium">
                Signals
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              Welcome, {displayName}
            </span>
            <button
              onClick={signOut}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}