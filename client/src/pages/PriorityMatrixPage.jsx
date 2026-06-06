import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import MainLayout from '../components/layout/MainLayout';
import TaskDetailModal from '../components/kanban/TaskDetailModal';
import { Grid2X2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { isAfter, parseISO } from 'date-fns';

// The 4 quadrants of the Eisenhower / Priority Matrix
const QUADRANTS = [
  {
    key: 'do-first',
    title: 'Do First',
    subtitle: 'Critical & High priority, not done',
    corner: 'top-left',
    gradient: 'from-red-500/10 to-transparent',
    border: 'border-red-500/20',
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
    dot: 'bg-red-400',
    filter: (t) => (t.priority === 'critical' || t.priority === 'high') && t.status !== 'done',
  },
  {
    key: 'schedule',
    title: 'Schedule',
    subtitle: 'Medium priority, not done',
    corner: 'top-right',
    gradient: 'from-orange-500/10 to-transparent',
    border: 'border-orange-500/20',
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    dot: 'bg-orange-400',
    filter: (t) => t.priority === 'medium' && t.status !== 'done',
  },
  {
    key: 'delegate',
    title: 'Delegate',
    subtitle: 'Low priority, not done',
    corner: 'bottom-left',
    gradient: 'from-blue-500/10 to-transparent',
    border: 'border-blue-500/20',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dot: 'bg-blue-400',
    filter: (t) => t.priority === 'low' && t.status !== 'done',
  },
  {
    key: 'done',
    title: 'Completed',
    subtitle: 'All finished tasks',
    corner: 'bottom-right',
    gradient: 'from-green-500/10 to-transparent',
    border: 'border-green-500/20',
    badge: 'bg-green-500/10 text-green-400 border-green-500/20',
    dot: 'bg-green-400',
    filter: (t) => t.status === 'done',
  },
];

function TaskPill({ task, onClick }) {
  const isOverdue = task.status !== 'done' && task.deadline && isAfter(new Date(), parseISO(task.deadline));
  return (
    <button
      onClick={() => onClick(task)}
      className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg transition-colors group text-xs"
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        task.priority === 'critical' ? 'bg-red-400' :
        task.priority === 'high' ? 'bg-orange-400' :
        task.priority === 'medium' ? 'bg-blue-400' : 'bg-gray-500'
      }`} />
      <span className="truncate text-gray-300 group-hover:text-white transition-colors">{task.title}</span>
      {isOverdue && <span className="ml-auto text-red-400 text-[9px] font-bold shrink-0">LATE</span>}
    </button>
  );
}

export default function PriorityMatrixPage() {
  const { user, token } = useAuth();
  const [selectedTask, setSelectedTask] = useState(null);

  if (user && user.role !== 'manager') return <Navigate to="/dashboard" replace />;

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', null],
    queryFn: () => api.getTasks(token, null),
    enabled: !!token,
  });

  const allTasks = tasksData?.tasks || [];

  return (
    <MainLayout>
      <div className="max-w-5xl">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <div className="flex items-center gap-3 mb-1">
            <Grid2X2 size={24} className="text-indigo-400" />
            <h1 className="text-3xl font-black text-white">Priority Matrix</h1>
          </div>
          <p className="text-gray-500 text-sm pl-9">
            Eisenhower matrix — organise what to tackle, schedule, delegate, or celebrate
          </p>
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUADRANTS.map((q, qi) => {
            const tasks = allTasks.filter(q.filter);
            return (
              <div
                key={q.key}
                className={`relative glass-panel ${q.border} rounded-2xl p-5 animate-fade-up min-h-[240px] flex flex-col`}
                style={{ animationDelay: `${qi * 80}ms` }}
              >
                {/* Gradient accent */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${q.gradient} pointer-events-none`} />

                {/* Header */}
                <div className="flex items-start justify-between mb-4 relative">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`w-2 h-2 rounded-full ${q.dot}`} />
                      <h2 className="font-bold text-white text-base">{q.title}</h2>
                    </div>
                    <p className="text-xs text-gray-500 pl-4">{q.subtitle}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${q.badge}`}>
                    {tasks.length}
                  </span>
                </div>

                {/* Task list */}
                <div className="flex-1 space-y-1.5 relative overflow-y-auto max-h-48 pr-1">
                  {isLoading ? (
                    <div className="space-y-2">
                      <div className="w-full h-6 bg-white/5 rounded-lg animate-pulse" />
                      <div className="w-3/4 h-6 bg-white/5 rounded-lg animate-pulse" />
                    </div>
                  ) : tasks.length === 0 ? (
                    <p className="text-xs text-gray-600 italic text-center py-6">No tasks here 🎉</p>
                  ) : (
                    tasks.map(task => (
                      <TaskPill key={task.taskId} task={task} onClick={setSelectedTask} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-xs text-gray-500 animate-fade-up">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> Critical/High: do immediately</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" /> Medium: schedule for later</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> Low: delegate if possible</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" /> Done: completed tasks</span>
        </div>
      </div>

      <TaskDetailModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
      />
    </MainLayout>
  );
}
