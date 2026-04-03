"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useClientAuth } from "@/hooks/useClientAuth";
import Link from "next/link";
import {
  FileText,
  Receipt,
  ImageIcon,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, _hasHydrated, client, logout } = useClientAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

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
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <p className="text-sm text-slate-500">
            {navItems.find((n) => pathname.startsWith(n.href))?.label ??
              "Portal"}
          </p>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
