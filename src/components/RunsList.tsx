'use client';

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

interface RunsListProps {
  runs: Run[];
  onDeleteRun?: (runId: string) => void;
}

export function RunsList({ runs, onDeleteRun }: RunsListProps) {
  if (runs.length === 0) {
    return null;
  }

  return (
    <div className="card p-6 mt-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Execution History</h2>
      <div className="space-y-4">
        {runs.map((run, index) => (
          <div key={run.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer transition-colors group">
            <div 
              className="flex items-center gap-4 flex-1"
              onClick={() => window.open(`https://app.rapidata.ai/order/detail/${run.rapidataOrderId}`, '_blank')}
            >
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded-full text-sm font-medium group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                #{index + 1}
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                  Run {run.id.slice(0, 8)}...
                  <span className={`ml-2 ${
                    run.status === 'completed' ? 'badge-success badge-sm' :
                    run.status === 'processing' ? 'badge-warning badge-sm' :
                    run.status === 'failed' ? 'badge-danger badge-sm' :
                    'badge-neutral badge-sm'
                  }`}>
                    {run.status || 'unknown'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Started: {new Date(run.startedAt).toLocaleString()}
                </div>
                {run.completedAt && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Completed: {new Date(run.completedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-medium text-gray-900 dark:text-white">{run.totalVotes} votes</div>
                {run.completedAt && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Duration: {Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000 / 60)} min
                  </div>
                )}
              </div>
              {onDeleteRun && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRun(run.id);
                  }}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete this run"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
