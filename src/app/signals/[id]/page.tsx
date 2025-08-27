'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { SignalChart } from "@/components/SignalChart";
import { RunsList } from "@/components/RunsList";
import { SignalActions } from "@/components/SignalActions";
import { CountryFlags } from "@/components/CountryFlags";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useGlobalNotifications, useGlobalConfirmation } from "@/app/providers";

interface Response {
  [option: string]: number;
}

interface Percentages {
  [option: string]: number;
}

interface Run {
  id: string;
  status?: string;
  startedAt: string;
  completedAt: string;
  rapidataOrderId: string;
  totalVotes: number;
  responses: Response;
  percentages: Percentages;
}

interface SignalDetail {
  id: string;
  name: string;
  question: string;
  answerOptions: string[];
  voteCount: number;
  active: boolean;
  createdAt: string;
  countries?: string[];
  runs: Run[];
}

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
  const { user } = useRequireAuth();
  const { showError, showSuccess } = useGlobalNotifications();
  const { confirm } = useGlobalConfirmation();
  const params = useParams();
  const router = useRouter();
  const signalId = params.id as string;
  
  const [signal, setSignal] = useState<SignalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSignalDetails = async () => {
      if (!user?.access_token || !signalId) {
        return;
      }

      try {
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`,
        };

        const response = await fetch(`/api/signals/${signalId}/details`, { headers });
        if (response.ok) {
          const data = await response.json();
          setSignal(data);
        } else {
          setError('Failed to fetch signal details');
          showError('Failed to load signal details. Please try again.');
        }
      } catch (error) {
        console.error('Error fetching signal details:', error);
        setError('Failed to fetch signal details');
        showError('Error loading signal details. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchSignalDetails();
  }, [user?.access_token, signalId, showError]);

  const executeSignal = async () => {
    if (!user?.access_token) {
      showError('Authentication required to execute signal.');
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.access_token}`,
      };

      const response = await fetch('/api/signals/execute', {
        method: 'POST',
        headers,
        body: JSON.stringify({ signalId }),
      });

      if (response.ok) {
        const result = await response.json();
        showSuccess(`Signal executed successfully! Run ID: ${result.signalRunId}`);
        // Refresh the signal details to show the new run when it completes
        setTimeout(() => window.location.reload(), 2000);
      } else {
        const error = await response.json();
        showError(`Failed to execute signal: ${error.error}`);
      }
    } catch (error) {
      console.error('Error executing signal:', error);
      showError('Failed to execute signal. Please try again.');
    }
  };

  const deleteRun = async (runId: string) => {
    const confirmed = await confirm({
      title: 'Delete Run',
      message: 'Are you sure you want to delete this run? This action cannot be undone.',
      confirmText: 'Delete Run',
      confirmVariant: 'danger'
    });

    if (!confirmed) {
      return;
    }

    if (!user?.access_token) {
      showError('Authentication required to delete run.');
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.access_token}`,
      };

      const response = await fetch(`/api/signals/${signalId}/runs/${runId}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        showSuccess('Run deleted successfully!');
        // Refresh the signal details to remove the deleted run
        window.location.reload();
      } else {
        const error = await response.json();
        showError(`Failed to delete run: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting run:', error);
      showError('Failed to delete run. Please try again.');
    }
  };

  const deleteSignal = async () => {
    const confirmed = await confirm({
      title: 'Delete Signal',
      message: 'Are you sure you want to delete this signal? This will delete all runs and associated data. This action cannot be undone.',
      confirmText: 'Delete Signal',
      confirmVariant: 'danger'
    });

    if (!confirmed) {
      return;
    }

    if (!user?.access_token) {
      showError('Authentication required to delete signal.');
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.access_token}`,
      };

      const response = await fetch(`/api/signals/${signalId}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        showSuccess('Signal deleted successfully!');
        // Redirect to signals list
        router.push('/signals');
      } else {
        const error = await response.json();
        showError(`Failed to delete signal: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting signal:', error);
      showError('Failed to delete signal. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <div className="text-gray-500">Loading signal details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-gray-600">{error || 'Signal not found'}</p>
            <Link href="/signals" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
              ← Back to Signals
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const colors = generateColors(signal.answerOptions.length);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Signal Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{signal.name}</h1>
            <div className="flex items-center gap-4 mt-2">
              <span className={`px-2 py-1 text-xs rounded ${signal.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {signal.active ? 'Active' : 'Inactive'}
              </span>
              <span className="text-sm text-gray-600">
                {signal.voteCount} votes/day
              </span>
              <span className="text-sm text-gray-600">
                {signal.runs.length} completed runs
              </span>
            </div>
          </div>
          <SignalActions
            isActive={signal.active}
            onExecute={executeSignal}
            onDelete={deleteSignal}
          />
        </div>

        {/* Signal Details */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Question</h2>
            <p className="text-gray-700">{signal.question}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Answer Options</h2>
            <div className="grid grid-cols-2 gap-2">
              {signal.answerOptions.map((option, index) => (
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

        {/* Country Filter */}
        {signal.countries && signal.countries.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Country Filter</h2>
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-600">
                This signal is filtered to responses from the following {signal.countries.length === 1 ? 'country' : 'countries'}:
              </p>
              <CountryFlags countries={signal.countries} />
            </div>
          </div>
        )}

        {/* Chart */}
        <SignalChart runs={signal.runs} answerOptions={signal.answerOptions} />

        {/* Execute Signal CTA for empty state */}
        {signal.runs.length === 0 && signal.active && (
          <div className="bg-gray-50 rounded-lg p-12 text-center mt-8">
            <button
              onClick={executeSignal}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Execute Signal
            </button>
          </div>
        )}

        {/* Runs History */}
        <RunsList runs={signal.runs} onDeleteRun={deleteRun} />
      </div>
    </div>
  );
}

export default function SignalDetailPage() {
  return (
    <AuthGuard>
      <SignalDetailPageContent />
    </AuthGuard>
  );
}