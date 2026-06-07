import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import MainLayout from '../components/layout/MainLayout';
import KanbanColumn from '../components/kanban/KanbanColumn';
import TaskCard from '../components/kanban/TaskCard';
import CreateTaskModal from '../components/kanban/CreateTaskModal';
import TaskDetailModal from '../components/kanban/TaskDetailModal';
import { Loader2, Plus, Filter, Users, Download, X, ChevronDown, Check } from 'lucide-react';
import { SkeletonKanbanBoard } from '../components/ui/Skeleton';

// ─── Custom Dropdown Component ───────────────────────────────────────────────
function CustomDropdown({ value, onChange, options, icon: Icon, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
          value !== options[0]?.value
            ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
        }`}
      >
        {Icon && <Icon size={14} className={value !== options[0]?.value ? 'text-indigo-400' : 'text-gray-400'} />}
        <span>{selected?.label || placeholder}</span>
        {selected?.dot && <span className={`w-2 h-2 rounded-full ${selected.dot}`} />}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''} text-gray-500`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 min-w-[160px] bg-[#13131f] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                value === opt.value
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {opt.dot && <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dot}`} />}
              <span className="flex-1 text-left">{opt.label}</span>
              {value === opt.value && <Check size={12} className="text-indigo-400 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const COLUMNS = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'in_review', title: 'In Review' },
  { id: 'done', title: 'Done' }
];

export default function TasksPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(user?.role === 'manager' ? 'all' : user?.teamId);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState(null);
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  
  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch Teams for Manager filter
  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.getTeams(token),
    enabled: !!token && user?.role === 'manager'
  });

  // Fetch Tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', selectedTeam],
    queryFn: () => api.getTasks(token, selectedTeam === 'all' ? null : selectedTeam),
    enabled: !!token && !!user
  });

  const rawTasks = tasksData?.tasks || [];

  // Normalize statuses so tasks created via API tests with non-standard casing (e.g. 'To Do') don't disappear
  const normalizedTasks = rawTasks.map(t => {
    let norm = 'todo';
    if (t.status) {
      const lowered = t.status.toLowerCase().replace(/_/g, ' ');
      if (lowered === 'to do' || lowered === 'todo') norm = 'todo';
      else if (lowered === 'in progress') norm = 'in_progress';
      else if (lowered === 'in review') norm = 'in_review';
      else if (lowered === 'done') norm = 'done';
    }
    return { ...t, normalizedStatus: norm };
  });

  // Derive unique assignees for the filter dropdown
  const uniqueAssignees = [...new Map(
    normalizedTasks
      .filter(t => t.assigneeName && t.assigneeName !== 'Unknown')
      .map(t => [t.assigneeId, { id: t.assigneeId, name: t.assigneeName }])
  ).values()];

  // Apply active filters — pure client-side, no API call needed
  const tasks = normalizedTasks.filter(t => {
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchesAssignee = filterAssignee === 'all' || t.assigneeId === filterAssignee;
    return matchesPriority && matchesAssignee;
  });

  const hasActiveFilters = filterPriority !== 'all' || filterAssignee !== 'all';
  const clearFilters = () => { setFilterPriority('all'); setFilterAssignee('all'); };

  // Update Task Mutation
  const updateMutation = useMutation({
    mutationFn: ({ taskId, status }) => api.updateTaskStatus(token, taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const exportToCSV = () => {
    if (!tasks || tasks.length === 0) return;
    
    const headers = ['Task ID', 'Title', 'Priority', 'Status', 'Assignee', 'Deadline'];
    const csvContent = [
      headers.join(','),
      ...tasks.map(t => [
        t.taskId,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        t.priority,
        t.status,
        `"${(t.assigneeName || t.assigneeId || 'Unassigned').replace(/"/g, '""')}"`,
        t.deadline || ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `minijira_tasks_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCardClick = (task) => {
    setSelectedTaskForDetail(task);
    setDetailModalOpen(true);
  };

  const onDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    setActiveTask(tasks.find(t => t.taskId === active.id));
  };

  const onDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id;
    const newStatus = over.id; // Column ID
    
    // Find the original task
    const task = tasks.find(t => t.taskId === taskId);
    
    // Only update if status changed and it's a valid column
    if (task && task.status !== newStatus && COLUMNS.some(c => c.id === newStatus)) {
      updateMutation.mutate({ taskId, status: newStatus });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex flex-col h-[calc(100vh-160px)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="w-48 h-10 bg-white/10 rounded-lg animate-pulse mb-2"></div>
              <div className="w-64 h-4 bg-white/5 rounded-md animate-pulse"></div>
            </div>
          </div>
          <SkeletonKanbanBoard />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-160px)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 animate-fade-up">
          <div>
            <h1 className="text-3xl font-black text-white">Project Board</h1>
            <p className="text-gray-500 text-sm mt-1">Manage and track your team's tasks</p>
          </div>
          
          <div className="flex gap-2 items-center flex-wrap">
            {/* Team filter — manager only */}
            {user?.role === 'manager' && (
              <CustomDropdown
                value={selectedTeam}
                onChange={setSelectedTeam}
                icon={Users}
                options={[
                  { value: 'all', label: 'All Teams' },
                  ...(teamsData?.teams?.map(team => ({ value: team.teamId, label: team.name })) || [])
                ]}
              />
            )}

            {/* Priority filter */}
            <CustomDropdown
              value={filterPriority}
              onChange={setFilterPriority}
              icon={Filter}
              options={[
                { value: 'all',      label: 'All Priorities' },
                { value: 'critical', label: 'Critical', dot: 'bg-red-500' },
                { value: 'high',     label: 'High',     dot: 'bg-orange-500' },
                { value: 'medium',   label: 'Medium',   dot: 'bg-blue-500' },
                { value: 'low',      label: 'Low',      dot: 'bg-gray-500' },
              ]}
            />

            {/* Assignee filter */}
            <CustomDropdown
              value={filterAssignee}
              onChange={setFilterAssignee}
              icon={Users}
              options={[
                { value: 'all', label: 'All Members' },
                ...uniqueAssignees.map(a => ({ value: a.id, label: a.name }))
              ]}
            />

            {/* Clear filters badge */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-500/20 transition-colors"
              >
                <X size={12} /> Clear
              </button>
            )}
            
            {user?.role === 'manager' && (
              <>
                <button 
                  onClick={exportToCSV}
                  className="flex items-center px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors text-sm font-semibold gap-2"
                >
                  <Download size={15} /> Export
                </button>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="btn-glow flex items-center px-4 py-2 rounded-xl text-white text-sm font-bold gap-2"
                  style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                >
                  <Plus size={15} /> New Task
                </button>
              </>
            )}
          </div>
        </div>

        {/* Active filters display */}
        {hasActiveFilters && (
          <div className="flex gap-2 mb-4 animate-fade-up">
            <span className="text-xs text-gray-500 flex items-center">Filtered:</span>
            {filterPriority !== 'all' && (
              <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-medium capitalize">
                Priority: {filterPriority}
              </span>
            )}
            {filterAssignee !== 'all' && (
              <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-medium">
                Assignee: {uniqueAssignees.find(a => a.id === filterAssignee)?.name || filterAssignee}
              </span>
            )}
            <span className="text-xs text-gray-600">
              — {tasks.length} task{tasks.length !== 1 ? 's' : ''} shown
            </span>
          </div>
        )}

        {/* Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-6 overflow-x-auto pb-4 h-full scrollbar-hide">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                tasks={tasks.filter(t => t.normalizedStatus === col.id)}
                onCardClick={handleCardClick}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: '0.5',
                },
              },
            }),
          }}>
            {activeId && activeTask ? (
              <div className="w-[280px]">
                <TaskCard task={activeTask} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <CreateTaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      <TaskDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        task={selectedTaskForDetail}
      />
    </MainLayout>
  );
}
