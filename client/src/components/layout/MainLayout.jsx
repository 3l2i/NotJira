import Sidebar from './Sidebar';

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

      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="p-8 max-w-7xl mx-auto animate-fade-up">
          {children}
        </div>
      </main>
    </div>
  );
}
