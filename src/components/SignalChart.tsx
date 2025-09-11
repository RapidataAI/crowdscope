'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

interface DailyRun {
  id: string;
  date: string;
  runCount: number;
  totalVotes: number;
  responses: Response;
  percentages: Percentages;
  completedAt: string;
}

interface SignalChartProps {
  runs: Run[];
  dailyAggregated?: DailyRun[];
  answerOptions: string[];
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

export function SignalChart({ runs, dailyAggregated, answerOptions }: SignalChartProps) {
  // Use daily aggregated data if available, otherwise fall back to individual runs
  const dataToUse = dailyAggregated || runs;
  
  // Prepare chart data
  const chartData = dataToUse.map((item, index) => {
    const data: Record<string, unknown> = {
      runIndex: index + 1,
      completedAt: item.completedAt,
      totalVotes: item.totalVotes,
      runId: item.id,
      responses: item.responses,
      // Add additional info for daily aggregated data
      ...(dailyAggregated && 'runCount' in item ? { 
        date: item.date,
        runCount: item.runCount 
      } : {})
    };
    
    // Add percentage data for each option
    answerOptions.forEach(option => {
      data[option] = item.percentages[option] || 0;
    });
    
    return data;
  });

  const colors = generateColors(answerOptions.length);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ payload: Record<string, unknown> }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isDaily = dailyAggregated && data.date;
      const displayDate = isDaily 
        ? new Date(data.date as string).toLocaleDateString()
        : new Date(data.completedAt as string).toLocaleDateString();
      
      return (
        <div className="rounded-lg p-3 shadow-lg bg-white border border-gray-300 dark:bg-[#0b1020] dark:border-white/10">
          <p className="font-medium text-gray-900 dark:text-white">
            {isDaily ? displayDate : `Run #${label}`}
          </p>
          {!isDaily && <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{displayDate}</p>}
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            Total: {data.totalVotes as number} votes
            {isDaily && data.runCount ? ` (${data.runCount} runs)` : ''}
          </p>
          <div className="space-y-1">
            {answerOptions.map((option, index) => (
              <div key={option} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded mr-2" 
                    style={{ backgroundColor: colors[index] }}
                  ></div>
                  <span className="text-gray-900 dark:text-white">{option}:</span>
                </div>
                <div className="ml-2">
                  <span className="font-medium text-gray-900 dark:text-white">{(data.responses as Record<string, number>)[option] || 0}</span>
                  <span className="text-gray-700 dark:text-gray-300 ml-1">
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

  if (runs.length === 0) {
    return (
      <div className="card p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No completed runs yet</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">Execute this signal to see vote trends over time.</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Vote Trends Over Time</h2>
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
            
            {answerOptions.map((option, index) => (
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
  );
}
