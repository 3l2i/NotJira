import { useState, useEffect } from 'react';
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
import { Loader2, Plus, Filter, Users } from 'lucide-react';

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
  const tasks = rawTasks.map(t => {
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

  // Update Task Mutation
  const updateMutation = useMutation({
    mutationFn: ({ taskId, status }) => api.updateTaskStatus(token, taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

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
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl logo-badge flex items-center justify-center animate-pulse-glow">
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            </div>
          </div>
          <p className="text-gray-500 font-medium text-sm tracking-widest uppercase">Loading board...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-160px)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-up">
          <div>
            <h1 className="text-3xl font-black text-white">Project Board</h1>
            <p className="text-gray-500 text-sm mt-1">Manage and track your team's tasks</p>
          </div>
          
          <div className="flex gap-3">
            {user?.role === 'manager' && (
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 mr-2">
                <Users size={16} className="text-gray-400 mr-2" />
                <select 
                  className="bg-transparent text-sm text-gray-300 py-2 focus:outline-none"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                >
                  <option value="all">All Teams</option>
                  {teamsData?.teams?.map(team => (
                    <option key={team.teamId} value={team.teamId}>{team.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            {user?.role === 'manager' && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="btn-glow flex items-center px-4 py-2.5 rounded-xl text-white text-sm font-bold gap-2"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
              >
                <Plus size={16} /> New Task
              </button>
            )}
          </div>
        </div>

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
