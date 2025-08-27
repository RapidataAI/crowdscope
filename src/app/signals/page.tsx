'use client';

import { useAuth } from "react-oidc-context";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuthenticatedApi } from "@/lib/api";

interface Signal {
  id: string;
  name: string;
  question: string;
  answerOptions: string[];
  voteCount: number;
  active: boolean;
  createdAt: string;
  _count: {
    signalRuns: number;
  };
}

export default function SignalsPage() {
  const auth = useAuth();
  const { authenticatedFetch } = useAuthenticatedApi();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSignals = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/signals');
      if (response.ok) {
        const data = await response.json();
        setSignals(data);
      }
    } catch (error) {
      console.error('Error fetching signals:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
  }, []);

  const toggleSignalStatus = async (signalId: string, currentStatus: boolean) => {
    try {
      const response = await authenticatedFetch(`/api/signals/${signalId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          active: !currentStatus
        }),
      });

      if (response.ok) {
        // Update the signal in local state
        setSignals(prev => prev.map(signal => 
          signal.id === signalId 
            ? { ...signal, active: !currentStatus }
            : signal
        ));
      } else {
        alert('Failed to update signal status');
      }
    } catch (error) {
      console.error('Error updating signal:', error);
      alert('Failed to update signal status');
    }
  };

  const executeSignal = async (signalId: string) => {
    try {
      const response = await authenticatedFetch('/api/signals/execute', {
        method: 'POST',
        body: JSON.stringify({
          signalId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Signal executed successfully! Run ID: ${result.signalRunId}`);
        // Refresh the signals data to show updated run count
        fetchSignals();
      } else {
        const error = await response.json();
        alert(`Failed to execute signal: ${error.error}`);
      }
    } catch (error) {
      console.error('Error executing signal:', error);
      alert('Failed to execute signal');
    }
  };

  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      // Redirect to login if not authenticated
      auth.signinRedirect({ url_state: window.location.pathname })
    }
  }, [auth.isLoading, auth.user, auth])

  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500">Redirecting to login...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
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
                Welcome, {auth.user?.profile?.name || auth.user?.profile?.email}
              </span>
              <button
                onClick={() => auth.signoutRedirect()}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Signals</h1>
          <Link
            href="/signals/create"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Create New Signal
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading signals...</div>
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No signals yet
            </h3>
            <p className="text-gray-600 mb-4">
              Create your first signal to start tracking crowd insights.
            </p>
            <Link
              href="/signals/create"
              className="inline-flex px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Create Your First Signal
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {signals.map((signal) => (
              <Link
                key={signal.id}
                href={`/signals/${signal.id}`}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer block"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                    {signal.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${signal.active ? 'text-green-600' : 'text-gray-500'}`}>
                      {signal.active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSignalStatus(signal.id, signal.active);
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        signal.active ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          signal.active ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {signal.question}
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="text-sm text-gray-500">
                    Answer Options ({signal.answerOptions.length}):
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {signal.answerOptions.slice(0, 3).map((option, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {option}
                      </span>
                    ))}
                    {signal.answerOptions.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                        +{signal.answerOptions.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-3">
                  <div className="text-gray-500">
                    <span className="mr-4">{signal.voteCount} votes/day</span>
                    <span>{signal._count.signalRuns} runs</span>
                  </div>
                  {signal.active && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        executeSignal(signal.id);
                      }}
                      className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs rounded-md transition-colors"
                    >
                      Execute Now
                    </button>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}