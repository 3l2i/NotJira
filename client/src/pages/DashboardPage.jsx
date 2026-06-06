import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import MainLayout from '../components/layout/MainLayout';
import { isAfter, parseISO } from 'date-fns';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, Zap } from 'lucide-react';

const STAT_CARDS = [
  {
    key:   'active',
    label: 'Active Tasks',
    icon:  Zap,
    color: 'blue',
    iconColor: 'text-blue-400',
    bgIcon: 'bg-blue-500/10',
    ringColor: 'from-blue-500/20 to-transparent',
  },
  {
    key:   'completed',
    label: 'Completed',
    icon:  CheckCircle2,
    color: 'green',
    iconColor: 'text-green-400',
    bgIcon: 'bg-green-500/10',
    ringColor: 'from-green-500/20 to-transparent',
  },
  {
    key:   'overdue',
    label: 'Overdue',
    icon:  AlertTriangle,
    color: 'red',
    iconColor: 'text-red-400',
    bgIcon: 'bg-red-500/10',
    ringColor: 'from-red-500/20 to-transparent',
  },
];

export default function DashboardPage() {
  const { user, token } = useAuth();

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', user?.teamId],
    queryFn: () => api.getTasks(token, user?.role === 'manager' ? null : user?.teamId),
    enabled: !!token && !!user,
    refetchInterval: 5000 // Automatically refresh every 5 seconds
  });

  const tasks = tasksData?.tasks || [];
  const stats = {
    active:    tasks.filter(t => t.status !== 'done').length,
    completed: tasks.filter(t => t.status === 'done').length,
    overdue:   tasks.filter(t => t.status !== 'done' && t.deadline && isAfter(new Date(), parseISO(t.deadline))).length,
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-10 animate-fade-up">
        <p className="text-indigo-400/70 text-sm font-medium tracking-wider uppercase mb-1">{greeting} 👋</p>
        <h1 className="text-4xl font-black text-white mb-1">
          Welcome back, <span className="shimmer-text">{user?.name}</span>
        </h1>
        <p className="text-gray-500 text-sm mt-2">
          <span className="text-indigo-400/80 capitalize font-medium">{user?.role}</span>
          {user?.teamId && <> · Team <span className="text-white/60">{user?.teamId}</span></>}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, iconColor, bgIcon, ringColor }, i) => (
          <div
            key={key}
            className={`stat-card ${color} p-6 animate-fade-up`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {/* Top row */}
            <div className="flex items-center justify-between mb-4">
              <div className={`w-11 h-11 ${bgIcon} rounded-xl flex items-center justify-center`}>
                <Icon size={20} className={iconColor} />
              </div>
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${ringColor} flex items-center justify-center`}>
                <TrendingUp size={12} className={`${iconColor} opacity-60`} />
              </div>
            </div>
            {/* Count */}
            <p className="text-4xl font-black text-white mb-1 animate-fade-up" style={{ animationDelay: `${i * 100 + 200}ms` }}>
              {stats[key]}
            </p>
            <p className="text-sm text-gray-500 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent Tasks */}
      {tasks.length > 0 && (
        <div className="animate-fade-up delay-400">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Clock size={14} /> Recent Tasks
          </h2>
          <div className="glass-panel rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Task</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignee</th>
                </tr>
              </thead>
              <tbody>
                {tasks.slice(0, 6).map((task, i) => (
                  <tr
                    key={task.taskId}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors animate-fade-up"
                    style={{ animationDelay: `${500 + i * 60}ms` }}
                  >
                    <td className="px-5 py-3.5 text-gray-200 font-medium truncate max-w-[200px]">{task.title}</td>
                    <td className="px-5 py-3.5">
                      <span className={`priority-${task.priority} text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-gray-400 capitalize">{task.status?.replace('_', ' ')}</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs truncate max-w-[120px]">{task.assigneeName || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
