import { useState, type ComponentType } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  ListChecks,
  ClipboardCheck,
  LayoutDashboard,
  Building2,
  Network,
  Settings,
  Menu,
  X,
  ChevronsRight,
  ChevronsLeft,
} from "lucide-react";
import { useCompany } from "@/features/company/useCompany";
import type { Company } from "@/types/domain";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "المشاريع", icon: LayoutGrid },
  { to: "/tasks", label: "المهام", icon: ListChecks },
  { to: "/approvals", label: "الاعتمادات", icon: ClipboardCheck },
  { to: "/overview", label: "نظرة عامة", icon: LayoutDashboard },
  { to: "/departments", label: "الأقسام", icon: Building2 },
  { to: "/structure", label: "الهيكلة", icon: Network },
  { to: "/control-panel", label: "لوحة التحكم", icon: Settings },
];

function isNavItemActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/" || pathname.startsWith("/projects");
  return pathname.startsWith(to);
}

function SidebarBrand({ company, collapsed }: { company: Company; collapsed: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 px-4 py-4 border-b border-line/60 ${collapsed ? "justify-center px-2" : ""}`}>
      {company.logoUrl ? (
        <img src={company.logoUrl} alt={company.name} className="h-8 w-8 object-contain rounded shrink-0" />
      ) : (
        <div
          className="h-8 w-8 rounded shrink-0 flex items-center justify-center text-white text-xs font-bold"
          style={{ background: company.headerColor }}
        >
          {company.name.slice(0, 1)}
        </div>
      )}
      {!collapsed && <span className="text-sm font-bold text-ink truncate">{company.name}</span>}
    </div>
  );
}

function SidebarNav({ collapsed, pathname, onNavigate }: { collapsed: boolean; pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 flex flex-col gap-1 px-2 py-3 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const active = isNavItemActive(pathname, item.to);
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold no-underline transition-colors ${
              collapsed ? "justify-center px-0" : ""
            } ${active ? "bg-primary-bg text-primary" : "text-ink-soft hover:bg-bg"}`}
          >
            <Icon size={18} strokeWidth={2.2} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { company } = useCompany();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-bg">
      <aside
        className={`hidden md:flex flex-col shrink-0 border-l border-line/60 bg-panel transition-[width] duration-200 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        <SidebarBrand company={company} collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} pathname={location.pathname} />
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center gap-2 border-none border-t border-line/60 bg-transparent text-ink-soft text-xs font-semibold py-3 cursor-pointer hover:bg-bg"
        >
          {collapsed ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />}
          {!collapsed && "طي القائمة"}
        </button>
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-panel border-l border-line/60 flex flex-col">
            <div className="flex items-center justify-between px-2">
              <SidebarBrand company={company} collapsed={false} />
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="إغلاق القائمة"
                className="p-2 border-none bg-transparent cursor-pointer text-ink-soft shrink-0"
              >
                <X size={18} />
              </button>
            </div>
            <SidebarNav collapsed={false} pathname={location.pathname} onNavigate={() => setMobileOpen(false)} />
          </div>
          <button
            aria-label="إغلاق القائمة"
            onClick={() => setMobileOpen(false)}
            className="flex-1 bg-black/40 border-none cursor-pointer p-0"
          />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="md:hidden flex items-center gap-2 px-3 py-2.5 border-b border-line/60 bg-panel sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="فتح القائمة"
            className="p-1.5 border-none bg-transparent cursor-pointer text-ink shrink-0"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            {company.logoUrl && <img src={company.logoUrl} alt="" className="h-6 object-contain shrink-0" />}
            <span className="text-sm font-bold text-ink truncate">{company.name}</span>
          </div>
        </div>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
