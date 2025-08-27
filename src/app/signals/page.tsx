'use client';

import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { useSignals, useUpdateSignalStatus } from "@/hooks/useSignalsApi";

function SignalsPageContent() {
  // Use React Query hooks instead of manual state management
  const { data: signals, isLoading, error } = useSignals();
  const updateSignalStatus = useUpdateSignalStatus();

  const toggleSignalStatus = (signalId: string, currentStatus: boolean) => {
    // React Query will handle optimistic updates automatically
    updateSignalStatus.mutate({
      signalId,
      active: !currentStatus
    });
  };

  console.log({signals, isLoading})



  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="mb-4">
              <h1 className="page-header text-balance">Your Signals</h1>
              <p className="page-subtitle text-balance mb-0">
                Track trends and insights through recurring crowd surveys
              </p>
            </div>
            <div className="text-center py-8">
              <div className="text-red-500">Error loading signals: {error.message}</div>
              <div className="mt-4">
                <Link
                  href="/signals"
                  className="btn-primary"
                >
                  Retry
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4">
            <h1 className="page-header text-balance">Your Signals</h1>
            <p className="page-subtitle text-balance mb-0">
              Track trends and insights through recurring crowd surveys
            </p>
          </div>

          {isLoading || !signals ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Skeleton Cards */}
              {[1, 2, 3].map((index) => (
                <div key={index} className="card animate-pulse">
                  <div className="p-6">
                    {/* Header with title and toggle */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-6 w-11 bg-gray-200 rounded-full"></div>
                    </div>
                    
                    {/* Question */}
                    <div className="space-y-2 mb-6">
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                    
                    {/* Answer options */}
                    <div className="space-y-3 mb-6">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="flex flex-wrap gap-2 h-16 content-start">
                        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                        <div className="h-6 bg-gray-200 rounded-full w-14"></div>
                      </div>
                    </div>
                    
                    {/* Footer stats */}
                    <div className="flex justify-between items-center text-sm border-t border-gray-200 pt-4">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (signals.length === 0) ? (
            <div className="text-center py-20 card max-w-2xl mx-auto">
              <h3 className="section-header mb-3 text-balance">
                No signals yet
              </h3>
              <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
                Create your first signal to start tracking crowd insights and understanding population trends.
              </p>
              <Link
                href="/signals/create"
                className="btn-primary"
              >
                Create Your First Signal
              </Link>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Existing Signals */}
              {signals.map((signal, index) => (
                <Link
                  key={signal.id}
                  href={`/signals/${signal.id}`}
                  className="card-interactive group"
                >
                  <div className="p-6 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                        {signal.name}
                      </h3>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            toggleSignalStatus(signal.id, signal.active);
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                            signal.active ? 'bg-green-500' : 'bg-gray-300'
                          } hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 group/toggle`}
                          title={signal.active ? 'Active - Click to deactivate' : 'Inactive - Click to activate'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${
                              signal.active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-6 leading-relaxed line-clamp-3">
                      {signal.question}
                    </p>
                    
                    <div className="space-y-3 mb-6 flex-grow">
                      <div className="text-sm font-medium text-gray-700">
                        Answer Options ({signal.answerOptions.length})
                      </div>
                      <div className="flex flex-wrap gap-2 h-16 content-start">
                        {signal.answerOptions.slice(0, 3).map((option, index) => (
                          <span
                            key={index}
                            className="badge-neutral text-xs px-3 py-1.5"
                          >
                            {option}
                          </span>
                        ))}
                        {signal.answerOptions.length > 3 && (
                          <span className="badge-neutral text-xs px-3 py-1.5">
                            +{signal.answerOptions.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm border-t border-gray-200 pt-4 mt-auto">
                      <div className="flex items-center text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {signal.voteCount} votes/day
                      </div>
                      <div className="flex items-center text-gray-600 font-medium">
                        <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        {signal._count.signalRuns} runs
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              
              {/* Create New Signal Card */}
              <Link
                href="/signals/create"
                className="card-interactive group border border-gray-200 hover:border-blue-300 bg-gray-50/50 hover:bg-blue-50/50"
              >
                <div className="p-6 flex flex-col h-full items-center justify-center text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl mb-4 flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-600 group-hover:text-blue-600 transition-colors duration-200 mb-1">
                    Add New Signal
                  </h3>
                  <p className="text-gray-500 text-xs">
                    Create a new survey
                  </p>
                </div>
              </Link>
            </div>
          )}
        </div>
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