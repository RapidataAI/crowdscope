'use client';

import { useAuth } from "react-oidc-context";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthenticatedApi } from "@/lib/api";

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

// Country flags component
const CountryFlags = ({ countries }: { countries: string[] }) => {
  if (!countries || countries.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1">
      {countries.map((countryCode) => (
        <img
          key={countryCode}
          src={`https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`}
          alt={`${countryCode} flag`}
          className="border border-gray-200 rounded-sm"
          title={countryCode.toUpperCase()}
        />
      ))}
    </div>
  );
};

export default function SignalDetailPage() {
  const auth = useAuth();
  const { authenticatedFetch } = useAuthenticatedApi();
  const params = useParams();
  const router = useRouter();
  const signalId = params.id as string;
  
  const [signal, setSignal] = useState<SignalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSignalDetails = useCallback(async () => {
    try {
      const response = await authenticatedFetch(`/api/signals/${signalId}/details`);
      if (response.ok) {
        const data = await response.json();
        setSignal(data);
      } else {
        setError('Failed to fetch signal details');
      }
    } catch (error) {
      console.error('Error fetching signal details:', error);
      setError('Failed to fetch signal details');
    } finally {
      setLoading(false);
    }
  }, [signalId]);
  
  useEffect(() => {
    if (signalId) {
      fetchSignalDetails();
    }
  }, [signalId]);

  

  const executeSignal = async () => {
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
        // Refresh the signal details to show the new run when it completes
        setTimeout(() => fetchSignalDetails(), 2000);
      } else {
        const error = await response.json();
        alert(`Failed to execute signal: ${error.error}`);
      }
    } catch (error) {
      console.error('Error executing signal:', error);
      alert('Failed to execute signal');
    }
  };

  const deleteRun = async (runId: string) => {
    if (!confirm('Are you sure you want to delete this run? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/signals/${signalId}/runs/${runId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Run deleted successfully!');
        // Refresh the signal details to remove the deleted run
        fetchSignalDetails();
      } else {
        const error = await response.json();
        alert(`Failed to delete run: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting run:', error);
      alert('Failed to delete run');
    }
  };

  const deleteSignal = async () => {
    if (!confirm('Are you sure you want to delete this signal? This will delete all runs and associated data. This action cannot be undone.')) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/signals/${signalId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Signal deleted successfully!');
        // Redirect to signals list
        router.push('/signals');
      } else {
        const error = await response.json();
        alert(`Failed to delete signal: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting signal:', error);
      alert('Failed to delete signal');
    }
  };

  // Prepare chart data
  const chartData = signal?.runs.map((run, index) => {
    const data: Record<string, unknown> = {
      runIndex: index + 1,
      completedAt: run.completedAt,
      totalVotes: run.totalVotes,
      runId: run.id,
      responses: run.responses,
    };
    
    // Add percentage data for each option
    signal.answerOptions.forEach(option => {
      data[option] = run.percentages[option] || 0;
    });
    
    return data;
  }) || [];

  const colors = generateColors(signal?.answerOptions.length || 0);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ payload: Record<string, unknown> }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const date = new Date(data.completedAt as string).toLocaleDateString();
      
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-gray-900">Run #{label}</p>
          <p className="text-sm text-gray-700 mb-2">{date}</p>
          <p className="text-sm text-gray-700 mb-2">Total: {data.totalVotes as number} votes</p>
          <div className="space-y-1">
            {signal?.answerOptions.map((option, index) => (
              <div key={option} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded mr-2" 
                    style={{ backgroundColor: colors[index] }}
                  ></div>
                  <span className="text-gray-900">{option}:</span>
                </div>
                <div className="ml-2">
                  <span className="font-medium text-gray-900">{(data.responses as Record<string, number>)[option] || 0}</span>
                  <span className="text-gray-700 ml-1">
                    ({((data[option] as number) || 0).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (!auth.user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Please sign in to view signal details
          </h1>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading signal details...</div>
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600">{error || 'Signal not found'}</p>
          <Link href="/signals" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
            ← Back to Signals
          </Link>
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
        {/* Signal Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/signals" className="text-blue-600 hover:text-blue-700">
                ← Back to Signals
              </Link>
            </div>
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
          <div className="flex items-center gap-3">
            {signal.active && (
              <button
                onClick={executeSignal}
                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                title="Execute signal now"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            )}
            <button
              onClick={deleteSignal}
              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              title="Delete this signal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
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
        {signal.runs.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Vote Trends Over Time</h2>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  stackOffset="expand"
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="runIndex" 
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Run Number', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                    label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {signal.answerOptions.map((option, index) => (
                    <Area
                      key={option}
                      type="monotone"
                      dataKey={option}
                      stackId="1"
                      stroke={colors[index]}
                      fill={colors[index]}
                      fillOpacity={0.7}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No completed runs yet</h3>
            <p className="text-gray-600 mb-4">Execute this signal to see vote trends over time.</p>
            {signal.active && (
              <button
                onClick={executeSignal}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Execute Signal
              </button>
            )}
          </div>
        )}

        {/* Runs History */}
        {signal.runs.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Execution History</h2>
            <div className="space-y-4">
              {signal.runs.map((run, index) => (
                <div key={run.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group">
                  <div 
                    className="flex items-center gap-4 flex-1"
                    onClick={() => window.open(`https://app.rapidata.ai/order/detail/${run.rapidataOrderId}`, '_blank')}
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-medium group-hover:bg-blue-200 transition-colors">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        Run {run.id.slice(0, 8)}...
                        <span className={`ml-2 px-2 py-1 text-xs rounded ${
                          run.status === 'completed' ? 'bg-green-100 text-green-800' :
                          run.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          run.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {run.status || 'unknown'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Started: {new Date(run.startedAt).toLocaleString()}
                      </div>
                      {run.completedAt && (
                        <div className="text-sm text-gray-600">
                          Completed: {new Date(run.completedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{run.totalVotes} votes</div>
                      {run.completedAt && (
                        <div className="text-sm text-gray-600">
                          Duration: {Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000 / 60)} min
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRun(run.id);
                      }}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete this run"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}