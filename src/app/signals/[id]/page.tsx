'use client';

import React from "react";
import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useAuth } from "react-oidc-context";
import { Header } from "@/components/Header";
import { SignalChart } from "@/components/SignalChart";
import { RunsList } from "@/components/RunsList";
import { SignalActions } from "@/components/SignalActions";
import { CountryFlags } from "@/components/CountryFlags";
import { useSignal, usePublicSignal, useExecuteSignal, useDeleteSignal, useDeleteRun, useUpdateSignalVisibility, useUpdateSignalCountries, useUpdateSignalSettings } from "@/hooks/useSignalsApi";
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
  type UserProfileWithRoles = { roles?: string[] | string; role?: string[] | string };
  const profile = (auth.user?.profile ?? {}) as UserProfileWithRoles;
  const rawRoles = profile.roles ?? profile.role;
  const rolesArray: string[] = Array.isArray(rawRoles)
    ? rawRoles
    : typeof rawRoles === 'string'
      ? [rawRoles]
      : [];
  const isAdmin = isLoggedIn && rolesArray.some((r) => r.toLowerCase() === 'admin');
  const { data: authedSignal, isLoading: isLoadingAuthed, error: authedError } = useSignal(signalId);
  const { data: publicSignal, isLoading: isLoadingPublic, error: publicError } = usePublicSignal(signalId);
  const authedNotFound = isLoggedIn && (authedError as Error | undefined)?.message?.includes('404');
  const signal = isLoggedIn ? (authedSignal ?? (authedNotFound ? publicSignal : undefined)) : publicSignal;
  const isLoading = isLoggedIn ? (isLoadingAuthed || (authedNotFound && isLoadingPublic)) : isLoadingPublic;
  const error = isLoggedIn ? (authedNotFound ? publicError : authedError) : publicError;
  const executeSignal = useExecuteSignal();
  const deleteSignal = useDeleteSignal();
  const deleteRun = useDeleteRun();
  const updateVisibility = useUpdateSignalVisibility();
  const updateCountries = useUpdateSignalCountries();
  const updateSettings = useUpdateSignalSettings();
  const [editingCountries, setEditingCountries] = React.useState(false);
  const [countriesInput, setCountriesInput] = React.useState('');
  const [editingSettings, setEditingSettings] = React.useState(false);
  const [settingsFrequency, setSettingsFrequency] = React.useState<string>('daily');
  const [settingsVoteCount, setSettingsVoteCount] = React.useState<number>(100);

  // Action handlers using React Query mutations
  // Keep countries input in sync with loaded signal
  React.useEffect(() => {
    if (signal?.countries) setCountriesInput(signal.countries.join(', '));
    else setCountriesInput('');
  }, [signal?.countries]);

  // Keep settings inputs in sync with loaded signal
  React.useEffect(() => {
    if (signal) {
      setSettingsFrequency(signal.runFrequency);
      setSettingsVoteCount(signal.voteCount);
    }
  }, [signal]);

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
      <div className="min-h-screen bg-background">
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
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{isProbablyPrivate ? 'Private Signal' : 'Error'}</h1>
              {isProbablyPrivate ? (
                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-300">This signal is private. Please sign in to access it.</p>
                  <button className="btn-primary" onClick={() => auth.signinRedirect({ url_state: pathname })}>Sign In</button>
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-300">{(error as Error | undefined)?.message || 'Signal not found'}</p>
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
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto">
        {/* Signal Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{signal.name}</h1>
            <div className="flex items-center gap-4 mt-2">
              <span className={`${signal.active ? 'badge-success' : 'badge-neutral'} badge-sm`}>
                {signal.active ? 'Active' : 'Inactive'}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {signal.voteCount} votes/{signal.runFrequency === 'hourly' ? 'hour' : signal.runFrequency === 'daily' ? 'day' : signal.runFrequency === 'weekly' ? 'week' : 'month'}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {signal.runs.length} completed runs
              </span>
            </div>
          </div>
          {isLoggedIn && (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => updateVisibility.mutate({ signalId, isPublic: !signal.isPublic })}
                  className={`${
                    signal.isPublic
                      ? 'p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20'
                      : 'p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-200 dark:hover:bg-white/10'
                  } rounded-md transition-colors`}
                  title={signal.isPublic ? 'Public' : 'Private'}
                >
                  {signal.isPublic ? (
                    // Public: lock open (Heroicons outline style)
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9.75 9.75V7.5a3 3 0 0 1 5.97-.25" />
                      <path d="M5.25 10.5h13.5a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-.75.75H5.25a.75.75 0 0 1-.75-.75v-7.5a.75.75 0 0 1 .75-.75z" />
                    </svg>
                  ) : (
                    // Private: lock closed (Heroicons outline style)
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M16.5 10.5V8.25a4.5 4.5 0 1 0-9 0V10.5" />
                      <path d="M5.25 10.5h13.5a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-.75.75H5.25a.75.75 0 0 1-.75-.75v-7.5a.75.75 0 0 1 .75-.75z" />
                    </svg>
                  )}
                </button>
              )}
              <SignalActions
                isActive={signal.active}
                onExecute={handleExecuteSignal}
                onDelete={handleDeleteSignal}
              />
            </div>
          )}
        </div>

        {/* Signal Details */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="card">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Question</h2>
              <p className="text-gray-700 dark:text-gray-300">{signal.question}</p>
            </div>
          </div>
          
          <div className="card">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Answer Options</h2>
              <div className="grid grid-cols-2 gap-2">
                {signal.answerOptions.map((option: string, index: number) => (
                  <div key={option} className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded mr-2" 
                      style={{ backgroundColor: colors[index] }}
                    ></div>
                    <span className="text-gray-700 dark:text-gray-300">{option}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Country Filter */}
        <div className="card mb-8">
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Country Filter</h2>
              {isAdmin && (
                <button
                  onClick={() => setEditingCountries(v => !v)}
                  className="text-sm px-3 py-1 rounded-md border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  {editingCountries ? 'Cancel' : (signal.countries && signal.countries.length > 0 ? 'Edit' : 'Add')}
                </button>
              )}
            </div>
            {!editingCountries ? (
              signal.countries && signal.countries.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    This signal is filtered to responses from the following {signal.countries.length === 1 ? 'country' : 'countries'}:
                  </p>
                  <CountryFlags countries={signal.countries} />
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300">No country filter applied.</p>
              )
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={countriesInput}
                  onChange={(e) => setCountriesInput(e.target.value)}
                  placeholder="Comma or space-separated ISO codes, e.g., US, DE, GB"
                  className="input-field"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const parsed = countriesInput
                        .split(/[\s,]+/)
                        .map(c => c.trim().toUpperCase())
                        .filter(c => c.length >= 2)
                        .map(c => c.slice(0, 2));
                      updateCountries.mutate({ signalId, countries: parsed.length ? parsed : null }, { onSuccess: () => setEditingCountries(false) });
                    }}
                    className="btn-primary"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingCountries(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Run Settings */}
        <div className="card mb-8">
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Run Settings</h2>
              {isLoggedIn && (
                <button
                  onClick={() => setEditingSettings(v => !v)}
                  className="text-sm px-3 py-1 rounded-md border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  {editingSettings ? 'Cancel' : 'Edit'}
                </button>
              )}
            </div>
            {!editingSettings ? (
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Run Interval</div>
                  <div className="text-gray-800 dark:text-gray-100 capitalize">{signal.runFrequency}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Responses per datapoint</div>
                  <div className="text-gray-800 dark:text-gray-100">{signal.voteCount}</div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-600 dark:text-gray-300">Run Interval</label>
                    <select
                      value={settingsFrequency}
                      onChange={(e) => setSettingsFrequency(e.target.value)}
                      className="select-field"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-600 dark:text-gray-300">Responses per datapoint</label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={settingsVoteCount}
                      onChange={(e) => setSettingsVoteCount(Number(e.target.value))}
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      updateSettings.mutate({ signalId, runFrequency: settingsFrequency, voteCount: settingsVoteCount }, {
                        onSuccess: () => setEditingSettings(false)
                      });
                    }}
                    className="btn-primary"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingSettings(false);
                      setSettingsFrequency(signal.runFrequency);
                      setSettingsVoteCount(signal.voteCount);
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chart */}
        <SignalChart runs={signal.runs} dailyAggregated={signal.dailyAggregated} answerOptions={signal.answerOptions} />

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
