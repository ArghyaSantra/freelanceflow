"use client";

import { useEffect, useState } from "react";
import { clientPortalApi } from "@/lib/clientApi";
import { useClientAuth } from "@/hooks/useClientAuth";
import Link from "next/link";
import { FileText, Receipt, ImageIcon } from "lucide-react";

interface DashboardStats {
  pendingDocs: number;
  unpaidInvoices: number;
  pendingAssets: number;
}

export default function ClientDashboardPage() {
  const { client } = useClientAuth();
  const [stats, setStats] = useState<DashboardStats>({
    pendingDocs: 0,
    unpaidInvoices: 0,
    pendingAssets: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [docsRes, invoicesRes, assetsRes] = await Promise.all([
          clientPortalApi.getDocuments(),
          clientPortalApi.getInvoices(),
          clientPortalApi.getAssets(),
        ]);
        setStats({
          pendingDocs: docsRes.data.documents.filter(
            (d: any) => d.status === "SENT" || d.status === "VIEWED",
          ).length,
          unpaidInvoices: invoicesRes.data.invoices.filter((i: any) =>
            ["SENT", "VIEWED", "OVERDUE"].includes(i.status),
          ).length,
          pendingAssets: assetsRes.data.assets.filter(
            (a: any) => a.status === "PENDING",
          ).length,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    {
      label: "Documents to Sign",
      value: stats.pendingDocs,
      icon: FileText,
      href: "/client/documents",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Unpaid Invoices",
      value: stats.unpaidInvoices,
      icon: Receipt,
      href: "/client/invoices",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Assets Awaiting Approval",
      value: stats.pendingAssets,
      icon: ImageIcon,
      href: "/client/assets",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Welcome back, {client?.name}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Here's what needs your attention.
        </p>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map(({ label, value, icon: Icon, href, color, bg }) => (
            <Link
              key={href}
              href={href}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow"
            >
              <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{label}</p>
              {value > 0 && (
                <p className={`text-xs mt-2 font-medium ${color}`}>
                  Needs attention
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
