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

interface SignalChartProps {
  runs: Run[];
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

export function SignalChart({ runs, answerOptions }: SignalChartProps) {
  // Prepare chart data
  const chartData = runs.map((run, index) => {
    const data: Record<string, unknown> = {
      runIndex: index + 1,
      completedAt: run.completedAt,
      totalVotes: run.totalVotes,
      runId: run.id,
      responses: run.responses,
    };
    
    // Add percentage data for each option
    answerOptions.forEach(option => {
      data[option] = run.percentages[option] || 0;
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
      const date = new Date(data.completedAt as string).toLocaleDateString();
      
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-gray-900">Run #{label}</p>
          <p className="text-sm text-gray-700 mb-2">{date}</p>
          <p className="text-sm text-gray-700 mb-2">Total: {data.totalVotes as number} votes</p>
          <div className="space-y-1">
            {answerOptions.map((option, index) => (
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

  if (runs.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No completed runs yet</h3>
        <p className="text-gray-600 mb-4">Execute this signal to see vote trends over time.</p>
      </div>
    );
  }

  return (
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