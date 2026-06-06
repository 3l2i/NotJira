import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';

const COLUMN_META = {
  todo:        { color: 'from-gray-500/20',   dot: 'bg-gray-400',    label: 'To Do'       },
  in_progress: { color: 'from-blue-500/20',   dot: 'bg-blue-400',    label: 'In Progress' },
  in_review:   { color: 'from-yellow-500/20', dot: 'bg-yellow-400',  label: 'In Review'   },
  done:        { color: 'from-green-500/20',  dot: 'bg-green-400',   label: 'Done'        },
};

export default function KanbanColumn({ id, title, tasks, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const meta = COLUMN_META[id] || {};

  return (
    <div
      className={`kanban-column flex flex-col w-full min-w-[280px] h-full overflow-hidden transition-all duration-300
        ${isOver ? 'drop-active' : ''}
      `}
    >
      {/* Column Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${meta.dot} animate-pulse`} />
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest">{title}</h3>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-bold bg-white/5 text-gray-500 rounded-full border border-white/5">
          {tasks.length}
        </span>
      </div>

      {/* Glowing top line per column */}
      <div className={`h-px mx-4 mb-3 bg-gradient-to-r ${meta.color} to-transparent`} />

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 px-3 pb-3 overflow-y-auto min-h-[100px] group"
      >
        <SortableContext
          id={id}
          items={tasks.map(t => t.taskId)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task, i) => (
            <TaskCard key={task.taskId} task={task} onClick={onCardClick} index={i} />
          ))}
          {tasks.length === 0 && (
            <div className={`min-h-[80px] flex items-center justify-center rounded-xl border-2 border-dashed transition-colors ${isOver ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-white/[0.04]'}`}>
              <p className="text-[10px] text-gray-700 uppercase tracking-widest font-semibold">Drop here</p>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
