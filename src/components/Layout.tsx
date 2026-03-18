import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import {
  LayoutDashboard,
  Users,
  Building2,
  Upload,
  ClipboardList,
  ShieldCheck,
  LogOut,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  CreditCard,
  Briefcase,
  Stethoscope,
  MapPin,
} from "lucide-react";

export default function Layout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-full bg-transparent">
      <aside
        className={`${collapsed ? "w-20" : "w-72"} flex-shrink-0 bg-ink-950 text-white flex flex-col shadow-xl relative z-10 transition-all duration-300`}
      >
        {/* Header with Logo and Toggle */}
        <div className="px-4 py-5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            {/* Logo Section */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex-shrink-0 flex items-center justify-center shadow-lg">
                <Activity size={20} className="text-white" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="font-bold text-white text-lg tracking-tight leading-none">
                    VoiceAI
                  </p>
                  <p className="text-xs text-brand-300 font-medium mt-0.5">
                    Agent
                  </p>
                </div>
              )}
            </div>

            {/* Toggle Button */}
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors duration-200 text-brand-300 hover:text-white"
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {/* Operations Section */}
          {!collapsed && (
            <div className="px-2 py-3 mt-4 mb-2">
              <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
                Operations
              </p>
            </div>
          )}
          {[
            { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
            { to: "/patients", icon: Users, label: "Patients" },
            { to: "/upload", icon: Upload, label: "Upload CSV" },
            { to: "/results", icon: ClipboardList, label: "Results" },
            { to: "/coverage", icon: ShieldCheck, label: "Coverage" },
          ].map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-brand-500 text-white shadow-md"
                    : "text-brand-100 hover:text-white hover:bg-white/10"
                }`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}

          {/* Master Data Section */}
          {!collapsed && (
            <div className="px-2 py-2 mb-2">
              <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
                Master Data
              </p>
            </div>
          )}
          {[
            { to: "/providers", icon: Building2, label: "Providers" },
            { to: "/doctors", icon: Stethoscope, label: "Doctors" },
            { to: "/insurances", icon: Shield, label: "Insurances" },
            { to: "/payers", icon: CreditCard, label: "Payers" },
            { to: "/practices", icon: Briefcase, label: "Practices Group" },
            { to: "/practice-locations", icon: MapPin, label: "Practice Locations" },
          ].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-brand-500 text-white shadow-md"
                    : "text-brand-100 hover:text-white hover:bg-white/10"
                }`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User Section */}
        <div className="px-3 py-4 border-t border-white/10 bg-white/5 flex-shrink-0 space-y-3">
          {/* User Profile */}
          <div
            className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} p-2.5 rounded-lg bg-white/5 border border-white/10`}
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.email}
                </p>
                <p className="text-[10px] font-medium text-brand-300 capitalize leading-none mt-0.5">
                  {user?.role?.toLowerCase()}
                </p>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-2"} px-3 py-2.5 text-sm font-medium text-brand-100 hover:text-white hover:bg-red-500/20 hover:border-red-400/30 rounded-lg transition-all duration-200 border border-white/10`}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut size={16} className="flex-shrink-0" />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
