'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useGlobalNotifications } from "@/app/providers";

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

function SignalsPageContent() {
  const { user } = useRequireAuth();
  const { showError } = useGlobalNotifications();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSignals = async () => {
      if (!user?.access_token) {
        return;
      }

      try {
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`,
        };

        const response = await fetch('/api/signals', { headers });
        if (response.ok) {
          const data = await response.json();
          setSignals(data);
        } else {
          showError('Failed to fetch signals. Please try again.');
        }
      } catch (error) {
        console.error('Error fetching signals:', error);
        showError('Error loading signals. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
  }, [user?.access_token, showError]);

  const toggleSignalStatus = async (signalId: string, currentStatus: boolean) => {
    if (!user?.access_token) {
      showError('Authentication required to update signal status.');
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.access_token}`,
      };

      const response = await fetch(`/api/signals/${signalId}`, {
        method: 'PATCH',
        headers,
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
        showError('Failed to update signal status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating signal:', error);
      showError('Error updating signal status. Please check your connection.');
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <div className="text-gray-500">Loading signals...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

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
                    {signal.voteCount} votes/day
                  </div>
                  <div className="text-gray-500">
                    {signal._count.signalRuns} runs
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SignalsPage() {
  return (
    <AuthGuard>
      <SignalsPageContent />
    </AuthGuard>
  );
}