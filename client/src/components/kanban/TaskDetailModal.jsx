import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { X, MessageSquare, History, Send, Loader2, Clock, CheckCircle2, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Safe date formatter — never crashes if value is null/undefined
function safeFormat(dateStr, fmt = 'MMM d, h:mm a') {
  if (!dateStr) return 'Unknown date';
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return 'Invalid date';
  }
}

export default function TaskDetailModal({ isOpen, onClose, task }) {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('comments');
  const [newComment, setNewComment] = useState('');
  const [taskToDelete, setTaskToDelete] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');

  // Fetch Comments
  const { data: commentsData, isLoading: loadingComments } = useQuery({
    queryKey: ['comments', task?.taskId],
    queryFn: () => api.getComments(token, task?.taskId),
    enabled: isOpen && !!task?.taskId && activeTab === 'comments'
  });

  // Fetch Image Presigned URL if task has imageKey
  const { data: imageUrl } = useQuery({
    queryKey: ['taskImage', task?.imageKey],
    queryFn: async () => {
      const res = await fetch(`/api/upload/view-url/${encodeURIComponent(task.imageKey)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load image');
      const data = await res.json();
      return data.viewUrl;
    },
    enabled: isOpen && !!task?.imageKey && !!token
  });

  // Fetch Audit Log
  const { data: auditData, isLoading: loadingAudit } = useQuery({
    queryKey: ['audit', task?.taskId],
    queryFn: () => api.getAuditLog(token, task?.taskId),
    enabled: isOpen && !!task?.taskId && activeTab === 'history'
  });

  const commentMutation = useMutation({
    mutationFn: (content) => api.createComment(token, task.taskId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', task.taskId] });
      setNewComment('');
    }
  });
  
  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, content }) => api.updateComment(token, commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', task.taskId] });
      setEditingCommentId(null);
      setEditingCommentContent('');
    },
    onError: (err) => alert(`Failed to update comment: ${err.message}`)
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => api.deleteComment(token, task.taskId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', task.taskId] });
      setCommentToDelete(null);
    },
    onError: (err) => alert(`Failed to delete comment: ${err.message}`)
  });

  const deleteTaskMutation = useMutation({
    mutationFn: () => api.deleteTask(token, task.taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
    onError: (err) => {
      alert(`Failed to delete task: ${err.message}`);
      setTaskToDelete(false);
    }
  });

  if (!isOpen || !task) return null;

  const handlePostComment = (e) => {
    e.preventDefault();
    if (newComment.trim()) commentMutation.mutate(newComment.trim());
  };

  const priorityColor = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
    low:      'bg-gray-500/20 text-gray-400 border-gray-500/30',
  }[task.priority] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';

  const statusLabel = {
    todo:        'To Do',
    in_progress: 'In Progress',
    in_review:   'In Review',
    done:        'Done',
  }[task.status] || task.status;

  const comments   = commentsData?.comments  || [];
  const auditLogs  = auditData?.auditLog     || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#11111a] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="p-6 border-b border-white/5 flex-shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl font-bold text-white mb-2">{task.title}</h2>
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <span className={`px-2.5 py-1 rounded-md border uppercase tracking-wider ${priorityColor}`}>
                  {task.priority}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-gray-300 capitalize">
                  {statusLabel}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  Team: {task.teamId}
                </span>
                {task.projectId && (
                  <span className="px-2.5 py-1 rounded-md bg-teal-500/10 border border-teal-500/20 text-teal-400">
                    Project: {task.projectId}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {user?.role === 'manager' && (
                <button 
                  onClick={() => setTaskToDelete(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
                >
                  Delete Task
                </button>
              )}
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 flex-shrink-0">
                <X size={20} />
              </button>
            </div>
          </div>

          {task.imageKey && imageUrl && (
            <div className="mb-4 rounded-xl overflow-hidden border border-white/5 bg-white/[0.02]">
              <img src={imageUrl} alt="Task Attachment" className="w-full max-h-40 object-contain rounded-xl drop-shadow-2xl" />
            </div>
          )}

          <div className="text-sm text-gray-300 bg-white/5 p-4 rounded-xl border border-white/5">
            <p className="whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
          </div>

          <div className="flex flex-wrap items-center gap-6 mt-4 text-sm text-gray-400">
            <div className="flex items-center">
              <User size={14} className="mr-1.5 text-blue-400" />
              <span>
                Assigned:{' '}
                {task.assigneeName !== 'Unknown' && task.assigneeName
                  ? task.assigneeName
                  : task.assigneeId
                  ? `User ${task.assigneeId.slice(0, 4)}`
                  : 'Unassigned'}
              </span>
            </div>
            {task.deadline && (
              <div className="flex items-center">
                <Clock size={14} className="mr-1.5 text-red-400" />
                <span>Due: {safeFormat(task.deadline, 'MMM d, yyyy')}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────── */}
        <div className="flex border-b border-white/5 flex-shrink-0">
          {[
            { key: 'comments', label: 'Comments',  Icon: MessageSquare },
            ...(user?.role === 'manager' ? [{ key: 'history',  label: 'Audit Log', Icon: History }] : []),
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Icon size={15} className="mr-2" /> {label}
            </button>
          ))}
        </div>

        {/* ── Scrollable Body ────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 bg-black/20">

          {/* Comments tab */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              {loadingComments ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
              ) : comments.length === 0 ? (
                <p className="text-center text-gray-500 py-8 italic">No comments yet. Be the first!</p>
              ) : (
                comments.map(comment => {
                  const initials = (comment.authorName || '??').substring(0, 2).toUpperCase();
                  return (
                    <div key={comment.commentId} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-4 flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-gray-200">{comment.authorName || 'Unknown'}</span>
                            <span className="text-xs text-gray-500">{safeFormat(comment.createdAt)}</span>
                          </div>
                          <div className="flex gap-2">
                            {user?.userId === comment.authorId && (
                              <button 
                                onClick={() => {
                                  setEditingCommentId(comment.commentId);
                                  setEditingCommentContent(comment.content);
                                }}
                                className="text-xs text-blue-400/50 hover:text-blue-400 transition-colors"
                              >
                                Edit
                              </button>
                            )}
                            {(user?.userId === comment.authorId || user?.role === 'manager') && (
                              <button 
                                onClick={() => setCommentToDelete(comment.commentId)}
                                className="text-xs text-red-400/50 hover:text-red-400 transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                        {editingCommentId === comment.commentId ? (
                          <div className="mt-2">
                            <textarea
                              value={editingCommentContent}
                              onChange={(e) => setEditingCommentContent(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-20"
                            />
                            <div className="flex gap-2 mt-2">
                              <button 
                                onClick={() => updateCommentMutation.mutate({ commentId: comment.commentId, content: editingCommentContent })}
                                disabled={updateCommentMutation.isPending || !editingCommentContent.trim()}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                              >
                                {updateCommentMutation.isPending ? 'Saving...' : 'Save'}
                              </button>
                              <button 
                                onClick={() => setEditingCommentId(null)}
                                className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg transition-colors border border-white/10"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Audit Log tab */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {loadingAudit ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
              ) : auditLogs.length === 0 ? (
                <p className="text-center text-gray-500 py-8 italic">No status changes recorded yet.</p>
              ) : (
                auditLogs.map((log, idx) => (
                  <div key={log.timestamp || idx} className="flex items-start gap-4 p-4 bg-white/5 border border-white/5 rounded-xl">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${log.toStatus === 'done' ? 'bg-green-500/10' : 'bg-blue-500/10'}`}>
                      <CheckCircle2 size={16} className={log.toStatus === 'done' ? 'text-green-400' : 'text-blue-400'} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        {/* Use actorName (real name), fall back to actorId */}
                        <span className="font-semibold text-sm text-gray-200">{log.actorName || log.actorId || 'Unknown'}</span>
                        {/* 'timestamp' is the field name the backend uses as SK */}
                        <span className="text-xs text-gray-500">{safeFormat(log.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">
                        Moved from <span className="font-semibold text-gray-300">
                          {{ todo:'To Do', in_progress:'In Progress', in_review:'In Review', done:'Done' }[log.fromStatus] || log.fromStatus}
                        </span> to{' '}
                        <span className="font-semibold text-gray-300">
                          {{ todo:'To Do', in_progress:'In Progress', in_review:'In Review', done:'Done' }[log.toStatus] || log.toStatus}
                        </span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Comment input ──────────────────────────────── */}
        {activeTab === 'comments' && (
          <div className="p-4 border-t border-white/5 bg-[#0a0a0e] flex-shrink-0">
            <form onSubmit={handlePostComment} className="flex gap-3 items-end">
              <textarea
                placeholder="Write a comment... (Press Enter to send, Shift+Enter for new line)"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handlePostComment(e);
                  }
                }}
                className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none h-24 shadow-inner"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || commentMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white h-12 w-12 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0 mb-1 shadow-lg shadow-indigo-500/20"
              >
                {commentMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Task Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl">
          <div className="bg-[#1a1a24] border border-red-500/20 p-6 rounded-2xl max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Delete Task</h3>
            <p className="text-sm text-gray-400 mb-6">Are you sure you want to delete this task? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setTaskToDelete(false)} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors text-sm font-medium">
                Cancel
              </button>
              <button onClick={() => deleteTaskMutation.mutate()} disabled={deleteTaskMutation.isPending} className="flex-1 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 transition-colors text-sm font-bold flex justify-center items-center">
                {deleteTaskMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Delete Confirmation Modal */}
      {commentToDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl">
          <div className="bg-[#1a1a24] border border-red-500/20 p-6 rounded-2xl max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Delete Comment</h3>
            <p className="text-sm text-gray-400 mb-6">Are you sure you want to delete this comment?</p>
            <div className="flex gap-3">
              <button onClick={() => setCommentToDelete(null)} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors text-sm font-medium">
                Cancel
              </button>
              <button onClick={() => deleteCommentMutation.mutate(commentToDelete)} disabled={deleteCommentMutation.isPending} className="flex-1 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 transition-colors text-sm font-bold flex justify-center items-center">
                {deleteCommentMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
