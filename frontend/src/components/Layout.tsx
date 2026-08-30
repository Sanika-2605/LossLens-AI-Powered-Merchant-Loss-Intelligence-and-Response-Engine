import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Network, ArrowLeftRight, Share2, Activity, ShieldAlert } from 'lucide-react';

export const Layout: React.FC = () => {
  const navItems = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/ecosystem', label: 'Merchant Ecosystem', icon: Network },
    { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { path: '/graph', label: 'Graph Explorer', icon: Share2 },
    { path: '/events', label: 'Event Monitor', icon: Activity },
  ];

  return (
    <div className="flex h-screen bg-[#0b0f17] text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#131b29] border-r border-[#1f293d] flex flex-col">
        <div className="p-6 border-b border-[#1f293d] flex items-center space-x-3">
          <div className="p-2 bg-blue-600/20 text-blue-500 rounded-lg border border-blue-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wider text-white">LOSSLENS</h1>
            <p className="text-xs text-slate-400">Loss Intelligence Engine</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-medium'
                    : 'text-slate-400 hover:bg-[#1f293d]/50 hover:text-slate-200'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[#1f293d]">
          <div className="p-3 bg-[#0b0f17] rounded-xl border border-[#1f293d] text-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Environment</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="font-semibold text-slate-200">Razorpay Test Mode</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 border-b border-[#1f293d] bg-[#131b29]/50 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-sm font-semibold text-slate-400">Merchant Loss Intelligence & Response Engine</h2>
          <div className="flex items-center space-x-4">
            <span className="text-xs px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
              Engine Status: Active
            </span>
          </div>
        </header>

        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
