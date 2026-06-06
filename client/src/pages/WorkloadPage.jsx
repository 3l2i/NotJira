import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import MainLayout from '../components/layout/MainLayout';
import { Users, AlertTriangle } from 'lucide-react';
import { SkeletonCard } from '../components/ui/Skeleton';
import { Navigate } from 'react-router-dom';

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function WorkloadBar({ done, total }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[11px] text-gray-500 mb-1">
        <span>{done} / {total} done</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: pct >= 80 ? 'hsl(142,70%,50%)' : pct >= 40 ? 'hsl(220,80%,60%)' : 'hsl(280,70%,60%)',
          }}
        />
      </div>
    </div>
  );
}

export default function WorkloadPage() {
  const { user, token } = useAuth();

  // Redirect non-managers
  if (user && user.role !== 'manager') return <Navigate to="/dashboard" replace />;

  const { data: tasksData, isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks', null],
    queryFn: () => api.getTasks(token, null),
    enabled: !!token,
  });

  const { data: teamsData, isLoading: loadingTeams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.getTeams(token),
    enabled: !!token,
  });

  const isLoading = loadingTasks || loadingTeams;
  const allTasks = tasksData?.tasks || [];

  // Group tasks by assignee
  const workloadMap = new Map();
  allTasks.forEach(task => {
    if (!task.assigneeId) return;
    if (!workloadMap.has(task.assigneeId)) {
      workloadMap.set(task.assigneeId, {
        id: task.assigneeId,
        name: task.assigneeName || `User ${task.assigneeId.slice(0, 4)}`,
        tasks: [],
      });
    }
    workloadMap.get(task.assigneeId).tasks.push(task);
  });

  // Also add an "Unassigned" bucket
  const unassigned = allTasks.filter(t => !t.assigneeId);

  const members = [...workloadMap.values()].sort((a, b) => b.tasks.length - a.tasks.length);

  const totalTasks = allTasks.length;
  const totalDone = allTasks.filter(t => t.status === 'done').length;

  return (
    <MainLayout>
      <div className="max-w-5xl">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <h1 className="text-3xl font-black text-white mb-1">Workload View</h1>
          <p className="text-gray-500 text-sm">
            Showing task distribution across {members.length} team member{members.length !== 1 ? 's' : ''} 
            &nbsp;·&nbsp; {totalDone} / {totalTasks} tasks done overall
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
            <Users size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-300 font-semibold text-lg">No assigned tasks yet</p>
            <p className="text-gray-500 text-sm mt-2">Once tasks are assigned to team members, they will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member, i) => {
              const done       = member.tasks.filter(t => t.status === 'done').length;
              const inProgress = member.tasks.filter(t => t.status === 'in_progress').length;
              const overloaded = member.tasks.filter(t => t.status !== 'done').length >= 5;

              // Sort tasks by priority
              const sorted = [...member.tasks].sort(
                (a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
              );

              return (
                <div
                  key={member.id}
                  className={`glass-panel p-5 rounded-2xl animate-fade-up transition-colors ${overloaded ? 'border-orange-500/20' : ''}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {member.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.tasks.length} task{member.tasks.length !== 1 ? 's' : ''} · {inProgress} in progress</p>
                    </div>
                    {overloaded && (
                      <div title="Possibly overloaded (5+ active tasks)">
                        <AlertTriangle size={16} className="text-orange-400 shrink-0" />
                      </div>
                    )}
                  </div>

                  {/* Top 3 tasks preview */}
                  <div className="space-y-1.5 mb-1">
                    {sorted.slice(0, 3).map(task => (
                      <div key={task.taskId} className="flex items-center gap-2 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          task.priority === 'critical' ? 'bg-red-400' :
                          task.priority === 'high' ? 'bg-orange-400' :
                          task.priority === 'medium' ? 'bg-blue-400' : 'bg-gray-500'
                        }`} />
                        <span className={`truncate ${task.status === 'done' ? 'line-through text-gray-600' : 'text-gray-400'}`}>
                          {task.title}
                        </span>
                      </div>
                    ))}
                    {sorted.length > 3 && (
                      <p className="text-[11px] text-gray-600 pl-3.5">+{sorted.length - 3} more</p>
                    )}
                  </div>

                  <WorkloadBar done={done} total={member.tasks.length} />
                </div>
              );
            })}

            {/* Unassigned bucket */}
            {unassigned.length > 0 && (
              <div className="glass-panel p-5 rounded-2xl border-dashed border-gray-700/50 animate-fade-up">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-gray-700/40 border border-white/10 flex items-center justify-center text-gray-400 text-sm font-bold shrink-0">
                    ?
                  </div>
                  <div>
                    <p className="font-semibold text-gray-300 text-sm">Unassigned</p>
                    <p className="text-xs text-gray-500">{unassigned.length} task{unassigned.length !== 1 ? 's' : ''} with no owner</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {unassigned.slice(0, 3).map(task => (
                    <div key={task.taskId} className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-600 shrink-0" />
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                  {unassigned.length > 3 && (
                    <p className="text-[11px] text-gray-600 pl-3.5">+{unassigned.length - 3} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
