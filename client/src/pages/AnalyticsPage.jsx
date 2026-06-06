import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import MainLayout from '../components/layout/MainLayout';
import { isAfter, parseISO } from 'date-fns';
import { PieChart as PieIcon, BarChart2, Activity, AlertCircle, XCircle, CheckCircle2 } from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';

// Colors for the charts
const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsPage() {
  const { user, token } = useAuth();

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', user?.teamId],
    queryFn: () => api.getTasks(token, user?.role === 'manager' ? null : user?.teamId),
    enabled: !!token && !!user,
    refetchInterval: 5000 // auto-refresh
  });

  const tasks = tasksData?.tasks || [];

  // Normalize statuses to prevent duplicates (like 'todo' vs 'to do')
  const getStatusLabel = (s) => {
    if (!s) return 'To Do';
    const lowered = s.toLowerCase();
    const map = {
      todo: 'To Do',
      'to do': 'To Do',
      in_progress: 'In Progress',
      'in progress': 'In Progress',
      in_review: 'In Review',
      'in review': 'In Review',
      done: 'Done'
    };
    return map[lowered] || s.replace(/_/g, ' ').toUpperCase();
  };

  // General Status Analytics
  const activeCount = tasks.filter(t => getStatusLabel(t.status) !== 'Done').length;
  const completedCount = tasks.filter(t => getStatusLabel(t.status) === 'Done').length;
  const overdueCount = tasks.filter(t => getStatusLabel(t.status) !== 'Done' && t.deadline && isAfter(new Date(), parseISO(t.deadline))).length;

  // Dynamic grouping by State for the BarChart
  const tasksByState = tasks.reduce((acc, task) => {
    const status = getStatusLabel(task.status);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const barChartData = Object.entries(tasksByState).map(([state, count]) => ({
    name: state,
    Count: count,
  }));

  // Data for the PieChart (Overview)
  const pieChartData = [
    { name: 'Active', value: activeCount },
    { name: 'Completed', value: completedCount },
    { name: 'Overdue', value: overdueCount },
  ].filter(item => item.value > 0); // Only show segments with data

  return (
    <MainLayout>
      <div className="mb-10 animate-fade-up">
        <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
          <PieIcon className="text-indigo-400" size={32} />
          Task Analytics
        </h1>
        <p className="text-gray-500 text-sm">Real-time graphical breakdown of your workspace's tasks.</p>
      </div>

      {/* Number Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        <div className="stat-card bg-blue-500/5 border border-blue-500/20 p-6 rounded-2xl animate-fade-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg"><Activity className="text-blue-400" size={20} /></div>
            <h3 className="text-gray-400 font-medium">Active Tasks</h3>
          </div>
          <p className="text-4xl font-black text-white">{activeCount}</p>
        </div>

        <div className="stat-card bg-red-500/5 border border-red-500/20 p-6 rounded-2xl animate-fade-up delay-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/10 rounded-lg"><AlertCircle className="text-red-400" size={20} /></div>
            <h3 className="text-gray-400 font-medium">Overdue Tasks</h3>
          </div>
          <p className="text-4xl font-black text-white">{overdueCount}</p>
        </div>

        <div className="stat-card bg-green-500/5 border border-green-500/20 p-6 rounded-2xl animate-fade-up delay-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg"><CheckCircle2 className="text-green-400" size={20} /></div>
            <h3 className="text-gray-400 font-medium">Completed Tasks</h3>
          </div>
          <p className="text-4xl font-black text-white">{completedCount}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* Pie Chart */}
        <div className="glass-panel p-6 rounded-2xl animate-fade-up delay-300">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <PieIcon className="text-indigo-400" size={20} /> Task Distribution
          </h2>
          <div className="h-[300px]">
            {pieChartData.length === 0 ? (
              <p className="text-gray-500 italic text-sm text-center pt-20">No data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#11111a', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                    itemStyle={{ color: 'white' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="glass-panel p-6 rounded-2xl animate-fade-up delay-400">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <BarChart2 className="text-indigo-400" size={20} /> Tasks by Workflow State
          </h2>
          <div className="h-[300px]">
            {barChartData.length === 0 ? (
              <p className="text-gray-500 italic text-sm text-center pt-20">No tasks found to analyze.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{ backgroundColor: '#11111a', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                  />
                  <Bar dataKey="Count" fill="#6366f1" radius={[6, 6, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
