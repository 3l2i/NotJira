import Sidebar from './Sidebar';
import GlobalSearch from '../ui/GlobalSearch';

export default function MainLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#07070f' }}>
      {/* Aurora background — visible behind everything */}
      <div className="aurora-bg">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
      </div>
      {/* Grid overlay */}
      <div className="grid-overlay" />

      <Sidebar />

      {/* Global Search — always mounted, triggered with ⌘K from anywhere */}
      <GlobalSearch />

      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="p-8 max-w-7xl mx-auto animate-fade-up">
          {children}
        </div>
      </main>
    </div>
  );
}
