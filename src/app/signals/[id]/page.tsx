'use client';

import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useAuth } from "react-oidc-context";
import { Header } from "@/components/Header";
import { SignalChart } from "@/components/SignalChart";
import { RunsList } from "@/components/RunsList";
import { SignalActions } from "@/components/SignalActions";
import { CountryFlags } from "@/components/CountryFlags";
import { useSignal, usePublicSignal, useExecuteSignal, useDeleteSignal, useDeleteRun } from "@/hooks/useSignalsApi";
import { useGlobalConfirmation } from "@/app/providers";

// Generate distinct colors for options
const generateColors = (count: number) => {
  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red  
    '#10b981', // green
    '#f59e0b', // yellow
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#f97316', // orange
    '#84cc16', // lime
    '#ec4899', // pink
    '#6b7280', // gray
  ];
  
  return colors.slice(0, count);
};

function SignalDetailPageContent() {
  const auth = useAuth();
  const { confirm } = useGlobalConfirmation();
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const signalId = params.id as string;
  
  // Use React Query hooks for data fetching and mutations
  const isLoggedIn = !!auth.user;
  const { data: authedSignal, isLoading: isLoadingAuthed, error: authedError } = useSignal(signalId);
  const { data: publicSignal, isLoading: isLoadingPublic, error: publicError } = usePublicSignal(signalId);
  const signal = isLoggedIn ? authedSignal : publicSignal;
  const isLoading = isLoggedIn ? isLoadingAuthed : isLoadingPublic;
  const error = isLoggedIn ? authedError : publicError;
  const executeSignal = useExecuteSignal();
  const deleteSignal = useDeleteSignal();
  const deleteRun = useDeleteRun();

  // Action handlers using React Query mutations
  const handleExecuteSignal = async () => {
    if (!signalId) return;
    executeSignal.mutate(signalId);
  };

  const handleDeleteSignal = async () => {
    const confirmed = await confirm({
      title: 'Delete Signal',
      message: 'Are you sure you want to delete this signal? This will delete all runs and associated data. This action cannot be undone.',
      confirmText: 'Delete Signal',
      confirmVariant: 'danger'
    });

    if (!confirmed || !signalId) return;
    
    deleteSignal.mutate(signalId, {
      onSuccess: () => {
        router.push('/signals');
      }
    });
  };

  const handleDeleteRun = async (runId: string) => {
    const confirmed = await confirm({
      title: 'Delete Run',
      message: 'Are you sure you want to delete this run? This action cannot be undone.',
      confirmText: 'Delete Run',
      confirmVariant: 'danger'
    });

    if (!confirmed || !signalId) return;
    
    deleteRun.mutate({ signalId, runId });
  };




  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-8">
              <div className="text-gray-500">Loading signal details...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !signal) {
    // If unauthenticated and 404 from public endpoint, offer sign-in for private signals
    const isProbablyPrivate = !isLoggedIn && (error as Error | undefined)?.message?.includes('404');
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{isProbablyPrivate ? 'Private Signal' : 'Error'}</h1>
              {isProbablyPrivate ? (
                <div className="space-y-4">
                  <p className="text-gray-600">This signal is private. Please sign in to access it.</p>
                  <button className="btn-primary" onClick={() => auth.signinRedirect({ url_state: pathname })}>Sign In</button>
                </div>
              ) : (
                <p className="text-gray-600">{(error as Error | undefined)?.message || 'Signal not found'}</p>
              )}
              <Link href="/signals" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
                ← Back to Signals
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const colors = generateColors(signal.answerOptions.length);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto">
        {/* Signal Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{signal.name}</h1>
            <div className="flex items-center gap-4 mt-2">
              <span className={`px-2 py-1 text-xs rounded ${signal.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {signal.active ? 'Active' : 'Inactive'}
              </span>
              <span className="text-sm text-gray-600">
                {signal.voteCount} votes/{signal.runFrequency === 'hourly' ? 'hour' : signal.runFrequency === 'daily' ? 'day' : signal.runFrequency === 'weekly' ? 'week' : 'month'}
              </span>
              <span className="text-sm text-gray-600">
                {signal.runs.length} completed runs
              </span>
            </div>
          </div>
          {isLoggedIn && (
            <SignalActions
              isActive={signal.active}
              onExecute={handleExecuteSignal}
              onDelete={handleDeleteSignal}
            />
          )}
        </div>

        {/* Signal Details */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="card">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Question</h2>
              <p className="text-gray-700">{signal.question}</p>
            </div>
          </div>
          
          <div className="card">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Answer Options</h2>
              <div className="grid grid-cols-2 gap-2">
                {signal.answerOptions.map((option: string, index: number) => (
                  <div key={option} className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded mr-2" 
                      style={{ backgroundColor: colors[index] }}
                    ></div>
                    <span className="text-gray-700">{option}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Country Filter */}
        {signal.countries && signal.countries.length > 0 && (
          <div className="card mb-8">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Country Filter</h2>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-gray-600">
                  This signal is filtered to responses from the following {signal.countries.length === 1 ? 'country' : 'countries'}:
                </p>
                <CountryFlags countries={signal.countries} />
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <SignalChart runs={signal.runs} answerOptions={signal.answerOptions} />

        {/* Execute Signal CTA for empty state */}
        {isLoggedIn && signal.runs.length === 0 && signal.active && (
          <div className="card text-center mt-8">
            <div className="p-12">
              <button
                onClick={handleExecuteSignal}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Execute Signal
              </button>
            </div>
          </div>
        )}

        {/* Runs History */}
        <RunsList runs={signal.runs} onDeleteRun={isLoggedIn ? handleDeleteRun : undefined} />
        </div>
      </div>
    </div>
  );
}

export default function SignalDetailPage() {
  return <SignalDetailPageContent />;
}
