import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, CheckSquare, Users, FolderKanban, LogOut, ChevronLeft, ChevronRight, Sparkles, PieChart, Search, BarChart2, Grid2X2
} from 'lucide-react';

const APP_NAME = 'NotJira';
const APP_SHORT = 'NJ';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { name: 'Dashboard',  icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Board',      icon: CheckSquare,     path: '/tasks'     },
    { name: 'My Tasks',  icon: CheckSquare,     path: '/my-tasks'  },
    { name: 'Analytics', icon: PieChart,        path: '/analytics' },
  ];
  if (user?.role === 'manager') {
    navItems.push(
      { name: 'Workload',        icon: BarChart2,    path: '/workload'        },
      { name: 'Priority Matrix', icon: Grid2X2,      path: '/priority-matrix' },
      { name: 'Projects',        icon: FolderKanban, path: '/projects'        },
      { name: 'Manage Teams',    icon: Users,        path: '/teams'           }
    );
  }

  return (
    <div className={`relative h-screen border-r border-white/5 flex flex-col transition-all duration-300 ease-in-out animate-slide-in-left
      ${collapsed ? 'w-20' : 'w-64'}
    `} style={{ background: 'linear-gradient(180deg, #0e0e1c 0%, #0a0a14 100%)' }}>

      {/* Subtle left-edge glow line */}
      <div className="absolute right-0 top-1/4 w-px h-1/2 bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent pointer-events-none" />

      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3.5 top-8 w-7 h-7 bg-[#1a1a2e] border border-indigo-500/30 rounded-full flex items-center justify-center text-indigo-400 hover:text-white hover:border-indigo-400 hover:bg-indigo-500/20 transition-all z-20 shadow-lg"
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      {/* Logo */}
      <div className={`flex items-center h-20 border-b border-white/5 shrink-0 ${collapsed ? 'justify-center px-4' : 'px-5'}`}>
        <div className="logo-badge w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0 animate-pulse-glow">
          <Sparkles className="text-white w-5 h-5" />
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <span className="text-sm font-black tracking-widest uppercase shimmer-text whitespace-nowrap">
              {APP_NAME}
            </span>
          </div>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item, i) => (
          <NavLink
            key={item.name}
            to={item.path}
            title={collapsed ? item.name : undefined}
            className={({ isActive }) => `
              flex items-center px-3 py-3 rounded-xl transition-all duration-200 group relative
              animate-slide-in-left delay-${i * 100 + 100}
              ${isActive
                ? 'nav-active'
                : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.05]'
              }
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-full blur-[1px]" />
                )}
                <item.icon className={`w-5 h-5 shrink-0 transition-all ${isActive ? 'text-indigo-400' : 'group-hover:text-indigo-400'} ${collapsed ? '' : 'mr-3'}`} />
                {!collapsed && <span className="font-medium text-sm">{item.name}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Search shortcut hint */}
      {!collapsed && (
        <div className="px-4 pb-3">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true, bubbles: true }))}
            className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.07] rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-all text-sm"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="text-[10px] font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>
        </div>
      )}

      {/* User + Logout */}
      <div className="p-4 border-t border-white/5 shrink-0">
        <div className={`flex items-center ${collapsed ? 'justify-center mb-3' : 'mb-3'}`}>
          {/* Avatar with gradient ring */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 blur-[4px] opacity-60" />
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold uppercase text-sm shadow-lg">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
          {!collapsed && (
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-indigo-400/80 truncate capitalize">{user?.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          className={`flex items-center w-full px-3 py-2.5 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className={`w-5 h-5 shrink-0 group-hover:scale-110 transition-transform ${collapsed ? '' : 'mr-3'}`} />
          {!collapsed && <span className="font-medium text-sm">Logout</span>}
        </button>
      </div>
    </div>
  );
}
