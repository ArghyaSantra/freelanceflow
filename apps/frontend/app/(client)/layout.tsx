"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useClientAuth } from "@/hooks/useClientAuth";
import { clientApi } from "@/lib/clientApi";
import Link from "next/link";
import {
  FileText,
  Receipt,
  ImageIcon,
  LogOut,
  LayoutDashboard,
  Bell,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  linkPath?: string;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, _hasHydrated, client, logout } = useClientAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await clientApi.get("/client/notifications");
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchNotifications();

    const token = localStorage.getItem("clientAccessToken");
    if (!token) return;

    const es = new EventSource(
      `${API_URL}/client/notifications/stream?token=${token}`,
    );

    es.onmessage = (e) => {
      try {
        console.log({ e });
        const notif = JSON.parse(e.data);
        setNotifications((prev) => [notif, ...prev.slice(0, 29)]);
        setUnreadCount((prev) => prev + 1);
      } catch {
        /* ignore */
      }
    };

    return () => es.close();
  }, [isAuthenticated, fetchNotifications]);

  const handleNotifOpen = async (open: boolean) => {
    setNotifOpen(open);
    if (open && unreadCount > 0) {
      try {
        await clientApi.post("/client/notifications/mark-read");
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch {
        /* silent */
      }
    }
  };

  const notifIcon: Record<string, string> = {
    DOCUMENT_SENT: "📄",
    INVOICE_SENT: "🧾",
    ASSET_COMMENT: "💬",
    ASSET_UPLOADED: "🖼️",
  };

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.replace("/client/login");
      return;
    }
    setReady(true);
  }, [_hasHydrated, isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/client/login");
  };

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  const navItems = [
    { href: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/client/documents", label: "Documents", icon: FileText },
    { href: "/client/invoices", label: "Invoices", icon: Receipt },
    { href: "/client/assets", label: "Assets", icon: ImageIcon },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-200">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            Client Portal
          </p>
          <p className="text-sm font-semibold text-slate-800 truncate">
            {client?.name}
          </p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 w-full transition-colors"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {navItems.find((n) => pathname.startsWith(n.href))?.label ??
              "Portal"}
          </p>

          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => handleNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {notifOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setNotifOpen(false)}
                />
                <div className="absolute right-0 top-10 z-20 w-80 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">
                      Notifications
                    </p>
                    {unreadCount > 0 && (
                      <p className="text-xs text-slate-400">
                        {unreadCount} unread
                      </p>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                      {notifications.map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => {
                            setNotifOpen(false);
                            if (notif.linkPath) router.push(notif.linkPath);
                          }}
                          className={`w-full flex gap-3 items-start px-4 py-3 text-left hover:bg-slate-50 transition-colors ${!notif.read ? "bg-slate-50/70" : ""}`}
                        >
                          <span className="text-base shrink-0 mt-0.5">
                            {notifIcon[notif.type] ?? "🔔"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm ${!notif.read ? "font-medium" : ""}`}
                            >
                              {notif.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {formatDistanceToNow(new Date(notif.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          {!notif.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
