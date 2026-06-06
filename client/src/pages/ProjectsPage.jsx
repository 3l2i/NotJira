import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import MainLayout from '../components/layout/MainLayout';
import { Plus, Loader2, FolderKanban, X, Calendar, Edit2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function safeFormat(d, fmt = 'MMM d, yyyy') {
  if (!d) return '';
  try { return format(parseISO(d), fmt); } catch { return d; }
}

export default function ProjectsPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(token),
    enabled: !!token
  });

  const createMutation = useMutation({
    mutationFn: () => api.createProject(token, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowCreate(false);
      setForm({ name: '', description: '' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: () => api.updateProject(token, projectToEdit.projectId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectToEdit(null);
      setForm({ name: '', description: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteProject(token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectToDelete(null);
    },
    onError: (err) => {
      alert(`Failed to delete project: ${err.message}`);
      setProjectToDelete(null);
    }
  });

  const projects = projectsData?.projects || [];

  return (
    <MainLayout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Projects</h1>
            <p className="text-gray-400 mt-1">Track all company projects across teams</p>
          </div>
          {user?.role === 'manager' && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center px-4 py-2 bg-blue-600 rounded-xl text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 text-sm font-semibold"
            >
              <Plus size={16} className="mr-2" /> New Project
            </button>
          )}
        </div>

        {/* Create Project Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#11111a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Create New Project</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Project Name *</label>
                  <input
                    autoFocus required type="text"
                    placeholder="e.g. Mini-Jira MVP"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Description</label>
                  <textarea
                    placeholder="What is this project about?"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-20 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/5 transition-colors font-medium">
                    Cancel
                  </button>
                  <button
                    onClick={() => form.name.trim() && createMutation.mutate()}
                    disabled={!form.name.trim() || createMutation.isPending}
                    className="flex-[2] py-2.5 bg-blue-600 rounded-xl text-white hover:bg-blue-500 transition-all font-semibold disabled:opacity-50 flex items-center justify-center"
                  >
                    {createMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : 'Create Project'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Project Modal */}
        {projectToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#11111a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Edit Project</h2>
                <button onClick={() => { setProjectToEdit(null); setForm({ name: '', description: '' }); }} className="text-gray-400 hover:text-white"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Project Name *</label>
                  <input
                    autoFocus required type="text"
                    placeholder="e.g. Mini-Jira MVP"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Description</label>
                  <textarea
                    placeholder="What is this project about?"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-20 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setProjectToEdit(null); setForm({ name: '', description: '' }); }} className="flex-1 py-2.5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/5 transition-colors font-medium">
                    Cancel
                  </button>
                  <button
                    onClick={() => form.name.trim() && updateMutation.mutate()}
                    disabled={!form.name.trim() || updateMutation.isPending}
                    className="flex-[2] py-2.5 bg-blue-600 rounded-xl text-white hover:bg-blue-500 transition-all font-semibold disabled:opacity-50 flex items-center justify-center"
                  >
                    {updateMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Projects List */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
            <FolderKanban size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-300 font-semibold text-lg">No projects yet</p>
            <p className="text-gray-500 text-sm mt-2">
              {user?.role === 'manager' ? 'Click "+ New Project" to get started.' : 'No projects have been created yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(project => (
              <div key={project.projectId} className="glass-panel p-6 rounded-2xl hover:border-blue-500/30 transition-colors group relative">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                    <FolderKanban size={20} className="text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">{project.name}</h3>
                    {project.description && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{project.description}</p>
                    )}
                    {project.createdAt && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                        <Calendar size={11} /> Created {safeFormat(project.createdAt)}
                      </div>
                    )}
                  </div>
                  {user?.role === 'manager' && (
                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setProjectToEdit(project); setForm({ name: project.name, description: project.description || '' }); }}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                        title="Edit Project"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setProjectToDelete(project.projectId)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete Project"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Project Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a1a24] border border-red-500/20 p-6 rounded-2xl max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Delete Project</h3>
            <p className="text-sm text-gray-400 mb-6">Are you sure you want to delete this project? This will permanently remove it.</p>
            <div className="flex gap-3">
              <button onClick={() => setProjectToDelete(null)} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors text-sm font-medium">
                Cancel
              </button>
              <button onClick={() => deleteMutation.mutate(projectToDelete)} disabled={deleteMutation.isPending} className="flex-1 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 transition-colors text-sm font-bold flex justify-center items-center">
                {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
