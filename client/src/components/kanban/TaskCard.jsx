import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, User, MessageSquare, GripVertical, Image } from 'lucide-react';
import { format } from 'date-fns';

const PRIORITY_CLASSES = {
  low:      'priority-low',
  medium:   'priority-medium',
  high:     'priority-high',
  critical: 'priority-critical',
};

export default function TaskCard({ task, onClick, index = 0 }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging
  } = useSortable({ id: task.taskId });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.2 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={() => { if (!isDragging && onClick) onClick(task); }}
      className="task-card p-4 mb-2.5 cursor-pointer animate-card-enter"
      // Stagger each card's entrance
      data-delay={index * 60}
    >
      {/* Drag Handle */}
      <div
        {...listeners}
        onClick={e => e.stopPropagation()}
        className="absolute top-3.5 right-3.5 p-1 cursor-grab active:cursor-grabbing text-gray-700 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical size={13} />
      </div>

      {/* Priority + ID Row */}
      <div className="flex justify-between items-center mb-3 pr-4">
        <span className={`${PRIORITY_CLASSES[task.priority] || PRIORITY_CLASSES.medium} text-[9px] uppercase font-black px-2.5 py-0.5 rounded-full tracking-widest`}>
          {task.priority}
        </span>
        <div className="flex items-center gap-1.5">
          {task.imageKey && <Image size={11} className="text-indigo-400/60" />}
          <span className="text-[9px] text-gray-600 font-mono">#{task.taskId.slice(-4)}</span>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-gray-200 mb-3 line-clamp-2 group-hover:text-indigo-300 transition-colors leading-snug">
        {task.title}
      </h4>

      {/* Footer */}
      <div className="flex items-center gap-3 flex-wrap">
        {task.deadline && (
          <div className="flex items-center text-[10px] text-gray-500 gap-1">
            <Calendar size={11} className="text-gray-600" />
            {format(new Date(task.deadline), 'MMM dd')}
          </div>
        )}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {task.assigneeName && task.assigneeName !== 'Unknown' ? (
            <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[9px] font-bold shrink-0 border border-blue-500/30" title={task.assigneeName}>
              {task.assigneeName.substring(0, 2).toUpperCase()}
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-500/10 text-gray-500 flex items-center justify-center shrink-0 border border-gray-500/20" title="Unassigned">
              <User size={10} />
            </div>
          )}
          <span className="truncate text-[10px] text-gray-500">
            {task.assigneeName !== 'Unknown' && task.assigneeName 
              ? task.assigneeName.split(' ')[0] 
              : task.assigneeId 
                ? `User ${task.assigneeId.slice(0, 4)}` 
                : 'Unassigned'}
          </span>
        </div>
        {task.commentCount > 0 && (
          <div className="flex items-center text-[10px] text-indigo-400/70 gap-1">
            <MessageSquare size={11} />
            {task.commentCount}
          </div>
        )}
      </div>
    </div>
  );
}
