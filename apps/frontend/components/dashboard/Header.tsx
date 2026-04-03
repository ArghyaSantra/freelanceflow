"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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

export default function Header() {
  const { user, workspace, logout } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    // fetch history on load
    fetchNotifications();

    // open SSE stream
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const es = new EventSource(
      `${API_URL}/notifications/stream?token=${token}`,
    );

    es.onmessage = (e) => {
      try {
        const notif = JSON.parse(e.data);
        setNotifications((prev) => [notif, ...prev.slice(0, 29)]);
        setUnreadCount((prev) => prev + 1);
      } catch {
        /* ignore malformed */
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects, nothing to do
    };

    return () => es.close();
  }, [fetchNotifications]);

  const handleNotifOpen = async (open: boolean) => {
    setNotifOpen(open);
    if (open && unreadCount > 0) {
      try {
        await api.post("/notifications/mark-read");
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch {
        // silent
      }
    }
  };

  const handleNotifClick = (notif: Notification) => {
    setNotifOpen(false);
    if (notif.linkPath) router.push(notif.linkPath);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "FF";

  const notifIcon: Record<string, string> = {
    DOCUMENT_SIGNED: "✍️",
    DOCUMENT_SENT: "📄",
    INVOICE_PAID: "💰",
    INVOICE_SENT: "🧾",
    ASSET_COMMENT: "💬",
    ASSET_APPROVED: "✅",
    ASSET_REJECTED: "❌",
    ASSET_UPLOADED: "🖼️",
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div />

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <DropdownMenu open={notifOpen} onOpenChange={handleNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs font-normal text-slate-500">
                  {unreadCount} unread
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">
                No notifications yet
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={cn(
                      "flex gap-3 items-start px-3 py-3 cursor-pointer",
                      !notif.read && "bg-slate-50",
                    )}
                  >
                    <span className="text-base shrink-0 mt-0.5">
                      {notifIcon[notif.type] ?? "🔔"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn("text-sm", !notif.read && "font-medium")}
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
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-auto p-1"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-slate-900 text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-slate-900">
                  {user?.email}
                </p>
                <p className="text-xs text-slate-500">{workspace?.name}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
