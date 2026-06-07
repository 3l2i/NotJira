import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import MainLayout from '../components/layout/MainLayout';
import TaskDetailModal from '../components/kanban/TaskDetailModal';
import { CheckSquare, Clock, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';

function safeFormat(d, fmt = 'MMM d, yyyy') {
  if (!d) return '';
  try { return format(parseISO(d), fmt); } catch { return d; }
}

const STATUS_CONFIG = {
  todo:        { label: 'To Do',        color: 'bg-gray-500/20 text-gray-300 border-gray-500/20' },
  in_progress: { label: 'In Progress',  color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  in_review:   { label: 'In Review',    color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20' },
  done:        { label: 'Done',         color: 'bg-green-500/20 text-green-300 border-green-500/20' },
};

const PRIORITY_CONFIG = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  low:      'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function MyTasksPage() {
  const { user, token } = useAuth();
  const [selectedTask, setSelectedTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', user?.teamId],
    queryFn: () => api.getTasks(token, user?.teamId),
    enabled: !!token && !!user,
  });

  const allTasks = (tasksData?.tasks || []).filter(t => t.assigneeId === user?.userId);

  const myTasks = allTasks.filter(t => {
    if (filterStatus === 'all') return true;
    const norm = t.status?.toLowerCase().replace(/ /g, '_');
    return norm === filterStatus || t.status === filterStatus;
  });

  const stats = {
    total: allTasks.length,
    done: allTasks.filter(t => t.status === 'done').length,
    overdue: allTasks.filter(t => t.status !== 'done' && t.deadline && isAfter(new Date(), parseISO(t.deadline))).length,
    inProgress: allTasks.filter(t => t.status === 'in_progress').length,
  };

  return (
    <MainLayout>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <h1 className="text-3xl font-black text-white mb-1">My Tasks</h1>
          <p className="text-gray-500 text-sm">Tasks assigned specifically to you</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, icon: CheckSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Done', value: stats.done, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="glass-panel p-4 rounded-2xl flex items-center gap-3">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: 'all', label: 'All' },
            { key: 'todo', label: 'To Do' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'in_review', label: 'In Review' },
            { key: 'done', label: 'Done' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
                filterStatus === tab.key
                  ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
              {tab.key === 'all' && <span className="ml-1.5 text-xs text-gray-600">{allTasks.length}</span>}
            </button>
          ))}
        </div>

        {/* Tasks list */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
          </div>
        ) : myTasks.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
            <CheckSquare size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-300 font-semibold text-lg">
              {filterStatus === 'all' ? 'No tasks assigned to you yet!' : `No ${filterStatus.replace('_', ' ')} tasks`}
            </p>
            <p className="text-gray-500 text-sm mt-2">Tasks assigned to you will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myTasks.map((task, i) => {
              const isOverdue = task.status !== 'done' && task.deadline && isAfter(new Date(), parseISO(task.deadline));
              const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
              const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;

              return (
                <button
                  key={task.taskId}
                  onClick={() => setSelectedTask(task)}
                  className="w-full text-left glass-panel p-4 rounded-2xl hover:border-indigo-500/30 transition-all group animate-fade-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${priorityCfg}`}>
                          {task.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                        {isOverdue && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                            OVERDUE
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-200 group-hover:text-indigo-300 transition-colors text-sm leading-snug">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                      )}
                    </div>
                    {task.deadline && (
                      <div className={`flex items-center gap-1.5 text-xs shrink-0 ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
                        <Clock size={12} />
                        {safeFormat(task.deadline)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <TaskDetailModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
      />
    </MainLayout>
  );
}
