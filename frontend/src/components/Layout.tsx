import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ShieldAlert, CheckCircle2, ChevronLeft, ChevronRight, Search, Zap, AlertCircle } from 'lucide-react';
import { LossLensLogo } from './LossLensLogo';

export const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/discovery', label: 'Emerging Risks', icon: AlertCircle },
    { path: '/investigation', label: 'Investigations', icon: ShieldAlert },
    { path: '/decision', label: 'Decisions', icon: CheckCircle2 },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 relative z-20 shadow-subtle ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo Section */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between min-h-[72px]">
          <LossLensLogo collapsed={collapsed} size="md" />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items (EXACTLY 4 items) */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/80 font-bold shadow-subtle'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Environment Status Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className={`p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-subtle ${collapsed ? 'text-center' : ''}`}>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              {!collapsed && <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-400">Environment</span>}
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            {!collapsed ? (
              <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-xs">
                <Zap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Razorpay Test Mode</span>
              </div>
            ) : (
              <Zap className="w-4 h-4 text-blue-600 mx-auto" />
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50">
        {/* Sticky Header */}
        <header className="h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-10 shadow-subtle">
          <div className="flex items-center space-x-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Merchant Risk Intelligence Platform
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search risks, entities, orders..."
                className="pl-9 pr-4 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 transition-all"
              />
            </div>
            <span className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full">
              Engine Status: Active
            </span>
          </div>
        </header>

        {/* Dynamic Page Outlet */}
        <div className="p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
