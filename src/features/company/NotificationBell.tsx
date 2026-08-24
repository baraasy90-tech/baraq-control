import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/features/company/api/useNotifications";
import type { AppNotification } from "@/types/domain";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export function NotificationBell({ userId, collapsed }: { userId: string; collapsed: boolean }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const notificationsQuery = useNotifications(userId);
  const notifications = notificationsQuery.data ?? [];
  const unread = notifications.filter((n) => !n.readAt);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClick = (n: AppNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="التنبيهات"
        className={`relative flex items-center gap-3 border-none bg-transparent text-ink-soft text-xs font-semibold py-2.5 cursor-pointer hover:bg-bg transition-colors w-full ${
          collapsed ? "justify-center px-0" : "px-4"
        }`}
      >
        <span className="relative">
          <Bell size={16} strokeWidth={2.2} />
          {unread.length > 0 && (
            <span className="absolute -top-1.5 -left-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-critical text-white text-[9px] font-bold flex items-center justify-center">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </span>
        {!collapsed && <span className="truncate">التنبيهات</span>}
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 right-0 w-72 bg-panel border border-line/60 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-line/60">
            <span className="text-xs font-bold text-ink">التنبيهات</span>
            {unread.length > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate(userId)}
                className="text-[10px] text-primary bg-transparent border-none cursor-pointer"
              >
                تعليم الكل كمقروء
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs text-ink-soft text-center py-6">لا توجد تنبيهات بعد</p>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`text-right px-3 py-2.5 border-b border-line/40 last:border-0 cursor-pointer border-x-0 border-t-0 ${
                    n.readAt ? "bg-transparent" : "bg-primary-bg"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-ink truncate">{n.title}</span>
                    <span className="text-[10px] text-ink-soft shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                  {n.body && <div className="text-[11px] text-ink-soft mt-0.5 truncate">{n.body}</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
