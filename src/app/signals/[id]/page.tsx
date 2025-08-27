'use client';

import { useUser } from "@stackframe/stack";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Response {
  [option: string]: number;
}

interface Percentages {
  [option: string]: number;
}

interface Run {
  id: string;
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

export default function SignalDetailPage() {
  const user = useUser();
  const params = useParams();
  const signalId = params.id as string;
  
  const [signal, setSignal] = useState<SignalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (signalId) {
      fetchSignalDetails();
    }
  }, [signalId]);

  const fetchSignalDetails = async () => {
    try {
      const response = await fetch(`/api/signals/${signalId}/details`);
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
  };

  const executeSignal = async () => {
    try {
      const response = await fetch('/api/signals/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  // Prepare chart data
  const chartData = signal?.runs.map((run, index) => {
    const data: any = {
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
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const date = new Date(data.completedAt).toLocaleDateString();
      
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-gray-900">Run #{label}</p>
          <p className="text-sm text-gray-600 mb-2">{date}</p>
          <p className="text-sm text-gray-600 mb-2">Total: {data.totalVotes} votes</p>
          <div className="space-y-1">
            {signal?.answerOptions.map((option, index) => (
              <div key={option} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded mr-2" 
                    style={{ backgroundColor: colors[index] }}
                  ></div>
                  <span>{option}:</span>
                </div>
                <div className="ml-2">
                  <span className="font-medium">{data.responses[option] || 0}</span>
                  <span className="text-gray-500 ml-1">
                    ({(data[option] || 0).toFixed(1)}%)
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

  if (!user) {
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
                Welcome, {user.displayName || user.primaryEmail}
              </span>
              <button
                onClick={() => user.signOut()}
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
          {signal.active && (
            <button
              onClick={executeSignal}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Execute Now
            </button>
          )}
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
      </div>
    </div>
  );
}