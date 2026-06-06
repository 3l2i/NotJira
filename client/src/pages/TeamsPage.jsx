import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import MainLayout from '../components/layout/MainLayout';
import { Plus, Loader2, Users, Trash2, X, ChevronRight, User, ArrowLeft } from 'lucide-react';

export default function TeamsPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null); // for detail panel

  const { data: teamsData, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.getTeams(token),
    enabled: !!token
  });

  const { data: allUsersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(token),
    enabled: !!token && user?.role === 'manager'
  });

  const { data: membersData, isLoading: loadingMembers } = useQuery({
    queryKey: ['teamMembers', selectedTeam?.teamId],
    queryFn: () => api.getTeamMembers(token, selectedTeam.teamId),
    enabled: !!selectedTeam?.teamId && !!token
  });

  const createMutation = useMutation({
    mutationFn: (name) => api.createTeam(token, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setNewTeamName('');
      setShowCreate(false);
    }
  });

  const assignMutation = useMutation({
    mutationFn: ({ userId, teamId }) => api.assignUserToTeam(token, userId, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', selectedTeam?.teamId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowAssign(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (teamId) => api.deleteTeam(token, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      if (selectedTeam) setSelectedTeam(null);
    }
  });

  const teams = teamsData?.teams || [];
  const members = membersData?.members || [];
  const allUsers = allUsersData?.users || [];
  
  // Filter users who are NOT in the current team
  const availableUsers = allUsers.filter(u => u.teamId !== selectedTeam?.teamId);

  // ── Team Detail Panel ───────────────────────────────────
  if (selectedTeam) {
    return (
      <MainLayout>
        <div className="max-w-3xl">
          <button
            onClick={() => setSelectedTeam(null)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
          >
            <ArrowLeft size={16} /> Back to Teams
          </button>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Users size={24} className="text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{selectedTeam.name}</h1>
                <p className="text-gray-500 text-sm font-mono mt-0.5">{selectedTeam.teamId}</p>
              </div>
            </div>
            <div className="flex gap-3">
              {user?.role === 'manager' && (
                <button
                  onClick={() => setShowAssign(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm font-medium shadow-lg shadow-blue-500/20"
                >
                  <Plus size={14} /> Add Member
                </button>
              )}
              {user?.role === 'manager' && (
                <button
                  onClick={() => deleteMutation.mutate(selectedTeam.teamId)}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors text-sm font-medium"
                >
                  <Trash2 size={14} /> Delete Team
                </button>
              )}
            </div>
          </div>

          {/* Assign Member Modal */}
          {showAssign && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-[#11111a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Add Team Member</h2>
                  <button onClick={() => setShowAssign(false)} className="text-gray-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                
                <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                  {availableUsers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No users available to add</p>
                  ) : (
                    <div className="space-y-2">
                      {availableUsers.map(u => (
                        <button
                          key={u.userId}
                          onClick={() => assignMutation.mutate({ userId: u.userId, teamId: selectedTeam.teamId })}
                          disabled={assignMutation.isPending}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-left group"
                        >
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold">
                            {(u.name || u.email).substring(0, 1).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-200 group-hover:text-white truncate">{u.name}</p>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                          {assignMutation.isPending ? (
                            <Loader2 size={16} className="animate-spin text-blue-500" />
                          ) : (
                            <Plus size={16} className="text-gray-600 group-hover:text-blue-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Members */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <User size={15} className="text-blue-400" />
                Team Members
                <span className="ml-1 px-2 py-0.5 text-[10px] bg-white/10 text-gray-400 rounded-full">
                  {members.length}
                </span>
              </h2>
            </div>
            {loadingMembers ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-blue-500" size={24} />
              </div>
            ) : members.length === 0 ? (
              <div className="py-12 text-center">
                <User size={32} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400">No members in this team yet</p>
                <p className="text-gray-500 text-sm mt-1">Members are assigned via Cognito user attributes</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {members.map(member => (
                  <li key={member.userId} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {(member.name || member.email || '?').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-200 truncate">{member.name || 'No name'}</p>
                      <p className="text-xs text-gray-500 truncate">{member.email}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                      member.role === 'manager'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {member.role}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </MainLayout>
    );
  }

  // ── Teams List ──────────────────────────────────────────
  return (
    <MainLayout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Teams</h1>
            <p className="text-gray-400 mt-1">Manage your company's teams</p>
          </div>
          {user?.role === 'manager' && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center px-4 py-2 bg-blue-600 rounded-xl text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 text-sm font-semibold"
            >
              <Plus size={16} className="mr-2" /> New Team
            </button>
          )}
        </div>

        {/* Create Team Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#11111a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Create New Team</h2>
                <button onClick={() => { setShowCreate(false); setNewTeamName(''); }} className="text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <input
                type="text"
                placeholder="Team name (e.g. Frontend)"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-4"
                onKeyDown={e => e.key === 'Enter' && newTeamName.trim() && createMutation.mutate(newTeamName.trim())}
              />
              <button
                onClick={() => createMutation.mutate(newTeamName.trim())}
                disabled={!newTeamName.trim() || createMutation.isPending}
                className="w-full py-2.5 bg-blue-600 rounded-xl text-white hover:bg-blue-500 transition-all font-semibold disabled:opacity-50 flex items-center justify-center"
              >
                {createMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : 'Create Team'}
              </button>
            </div>
          </div>
        )}

        {/* Teams Grid */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
        ) : teams.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
            <Users size={40} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 font-medium">No teams yet</p>
            <p className="text-gray-500 text-sm mt-1">Create your first team to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map(team => (
              <button
                key={team.teamId}
                onClick={() => setSelectedTeam(team)}
                className="glass-panel p-6 rounded-2xl hover:border-blue-500/30 transition-all group text-left w-full"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <Users size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">{team.name}</h3>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{team.teamId}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
