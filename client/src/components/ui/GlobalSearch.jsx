import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Search, X, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';

const PRIORITY_COLOR = {
  critical: 'text-red-400',
  high:     'text-orange-400',
  medium:   'text-blue-400',
  low:      'text-gray-400',
};

export default function GlobalSearch() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Re-use the cached tasks from the existing query — no extra API call!
  const { data: tasksData } = useQuery({
    queryKey: ['tasks', user?.role === 'manager' ? null : user?.teamId],
    queryFn: () => api.getTasks(token, user?.role === 'manager' ? null : user?.teamId),
    enabled: !!token && !!user && isOpen,
    staleTime: 30000,
  });

  const allTasks = tasksData?.tasks || [];

  const results = query.trim().length < 1 ? [] : allTasks.filter(t => {
    const q = query.toLowerCase();
    return (
      t.title?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.assigneeName?.toLowerCase().includes(q) ||
      t.priority?.toLowerCase().includes(q)
    );
  }).slice(0, 8);

  // ⌘K / Ctrl+K to open
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIdx(0);
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      handleSelect(results[selectedIdx]);
    }
  };

  useEffect(() => { setSelectedIdx(0); }, [results.length]);

  const handleSelect = useCallback((task) => {
    setIsOpen(false);
    setQuery('');
    // Navigate to the tasks board — the task will be visible there
    navigate('/tasks');
  }, [navigate]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] bg-black/70 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-xl mx-4 bg-[#13131f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-white/5 gap-3">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tasks, descriptions, assignees..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white text-base placeholder-gray-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[11px] text-gray-500 font-mono shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto">
          {query.trim().length < 1 ? (
            <div className="py-10 text-center text-gray-500 text-sm">
              Start typing to search tasks...
            </div>
          ) : results.length === 0 ? (
            <div className="py-10 text-center text-gray-500 text-sm">
              No tasks found for &quot;{query}&quot;
            </div>
          ) : (
            <ul className="p-2">
              {results.map((task, i) => (
                <li key={task.taskId}>
                  <button
                    className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl transition-colors ${
                      i === selectedIdx ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-white/5 border border-transparent'
                    }`}
                    onClick={() => handleSelect(task)}
                    onMouseEnter={() => setSelectedIdx(i)}
                  >
                    {/* Priority dot */}
                    <span className={`mt-1 text-[10px] font-black uppercase tracking-widest ${PRIORITY_COLOR[task.priority] || 'text-gray-500'} shrink-0`}>
                      {task.priority?.slice(0, 3)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-200 truncate">{task.title}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {task.assigneeName && task.assigneeName !== 'Unknown' ? task.assigneeName : 'Unassigned'}
                        {task.status && <span className="ml-2 capitalize text-gray-600">· {task.status.replace('_', ' ')}</span>}
                      </p>
                    </div>
                    {i === selectedIdx && (
                      <CornerDownLeft size={14} className="text-gray-500 shrink-0 mt-1" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2.5 border-t border-white/5 flex items-center gap-4 text-[11px] text-gray-600">
          <span className="flex items-center gap-1"><ArrowUp size={11} /><ArrowDown size={11} /> Navigate</span>
          <span className="flex items-center gap-1"><CornerDownLeft size={11} /> Open</span>
          <span className="flex items-center gap-1"><kbd className="font-mono">ESC</kbd> Close</span>
          <span className="ml-auto">{results.length > 0 ? `${results.length} result${results.length !== 1 ? 's' : ''}` : ''}</span>
        </div>
      </div>
    </div>
  );
}
