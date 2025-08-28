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
    <div className="bg-white border border-gray-200 rounded-lg p-6 mt-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Execution History</h2>
      <div className="space-y-4">
        {runs.map((run, index) => (
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
              {onDeleteRun && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRun(run.id);
                  }}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
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
