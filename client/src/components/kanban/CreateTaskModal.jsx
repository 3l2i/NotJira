import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { X, Loader2, Upload, Image as ImageIcon } from 'lucide-react';

export default function CreateTaskModal({ isOpen, onClose }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    teamId: '',
    assigneeId: '',
    projectId: '',
    deadline: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState('');

  // Fetch teams for the dropdown
  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.getTeams(token),
    enabled: isOpen && !!token
  });

  // Fetch users, filtered by selected team in the UI
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(token),
    enabled: isOpen && !!token
  });

  // Fetch projects for the dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(token),
    enabled: isOpen && !!token
  });

  const reset = () => {
    setFormData({ title: '', description: '', priority: 'medium', teamId: '', assigneeId: '', projectId: '', deadline: '' });
    setImageFile(null);
    setImagePreview(null);
    setUploadProgress('');
  };

  const mutation = useMutation({
    mutationFn: async (taskData) => {
      let imageKey = undefined;

      // Step 1: If a file is selected, upload to S3 via presigned URL
      if (imageFile) {
        setUploadProgress('Getting upload URL…');
        const { uploadUrl, key } = await api.getPresignedUrl(
          token,
          imageFile.name,
          imageFile.type,
          imageFile.size,
          'pending'
        );

        setUploadProgress('Uploading image to S3…');
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: imageFile,
          headers: { 'Content-Type': imageFile.type },
        });

        if (!uploadRes.ok) throw new Error('Image upload to S3 failed');
        imageKey = key;
        setUploadProgress('Creating task…');
      }

      // Step 2: Create the task (with optional imageKey)
      return api.createTask(token, { ...taskData, ...(imageKey ? { imageKey } : {}) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
      reset();
    },
    onError: () => setUploadProgress(''),
  });

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const assigneeName = formData.assigneeId 
      ? usersData?.users?.find(u => u.userId === formData.assigneeId)?.name 
      : undefined;
    mutation.mutate({ ...formData, assigneeName });
  };

  const filteredUsers = usersData?.users?.filter(
    u => !formData.teamId || u.teamId === formData.teamId
  ) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#11111a] border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">Create New Task</h2>
          <button onClick={() => { onClose(); reset(); }} className="p-2 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Title *</label>
            <input
              required
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="What needs to be done?"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Project */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Project *</label>
            <select
              required
              className="w-full bg-[#0a0a0e] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none"
              value={formData.projectId}
              onChange={e => setFormData({ ...formData, projectId: e.target.value })}
            >
              <option value="">Select Project</option>
              {projectsData?.projects?.map(project => (
                <option key={project.projectId} value={project.projectId}>{project.name}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Description *</label>
            <textarea
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-20 resize-none"
              placeholder="Add more details…"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Priority + Deadline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Priority *</label>
              <select
                required
                className="w-full bg-[#0a0a0e] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Deadline *</label>
              <input
                required
                type="date"
                className="w-full bg-[#0a0a0e] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                value={formData.deadline}
                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
          </div>

          {/* Team + Assignee */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Team *</label>
              <select
                required
                className="w-full bg-[#0a0a0e] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                value={formData.teamId}
                onChange={e => setFormData({ ...formData, teamId: e.target.value, assigneeId: '' })}
              >
                <option value="">Select Team</option>
                {teamsData?.teams?.map(team => (
                  <option key={team.teamId} value={team.teamId}>{team.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Assignee *</label>
              <select
                required
                className="w-full bg-[#0a0a0e] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                value={formData.assigneeId}
                onChange={e => setFormData({ ...formData, assigneeId: e.target.value })}
              >
                <option value="">Select Assignee</option>
                {filteredUsers.map(u => (
                  <option key={u.userId} value={u.userId}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Attachment (Image)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-xl border border-white/10" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 border-2 border-dashed border-white/10 rounded-xl text-gray-500 hover:border-blue-500/40 hover:text-gray-300 transition-colors flex flex-col items-center gap-2"
              >
                <Upload size={20} />
                <span className="text-sm">Click to upload image (max 5 MB)</span>
              </button>
            )}
          </div>

          {/* Upload progress indicator */}
          {uploadProgress && (
            <p className="text-xs text-blue-400 flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> {uploadProgress}
            </p>
          )}

          {/* Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => { onClose(); reset(); }}
              className="flex-1 py-3 border border-white/10 rounded-xl text-gray-300 hover:bg-white/5 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-[2] py-3 bg-blue-600 rounded-xl text-white hover:bg-blue-500 transition-all font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? <><Loader2 className="animate-spin" size={18} /> {uploadProgress || 'Creating…'}</> : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
