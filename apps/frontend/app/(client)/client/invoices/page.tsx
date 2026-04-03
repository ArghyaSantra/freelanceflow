"use client";

import { useEffect, useState } from "react";
import { clientPortalApi } from "@/lib/clientApi";
import Link from "next/link";
import { Receipt } from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  currency: string;
  dueDate: string;
  sentAt: string | null;
  project: { id: string; name: string };
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "text-slate-500 bg-slate-100" },
  SENT: { label: "Pending", color: "text-blue-600 bg-blue-50" },
  VIEWED: { label: "Viewed", color: "text-amber-600 bg-amber-50" },
  PAID: { label: "Paid", color: "text-green-600 bg-green-50" },
  OVERDUE: { label: "Overdue", color: "text-red-600 bg-red-50" },
  CANCELLED: { label: "Cancelled", color: "text-slate-400 bg-slate-100" },
};

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientPortalApi
      .getInvoices()
      .then((res) => setInvoices(res.data.invoices))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse"
          />
        ))}
      </div>
    );

  if (invoices.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Receipt size={40} className="text-slate-300 mb-3" />
        <p className="text-slate-500 text-sm">No invoices yet</p>
      </div>
    );

  return (
    <div className="space-y-3 max-w-3xl">
      {invoices.map((inv) => {
        const cfg = statusConfig[inv.status] ?? statusConfig.DRAFT;
        return (
          <Link
            key={inv.id}
            href={`/client/invoices/${inv.id}`}
            className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-5 py-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Receipt size={18} className="text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {inv.invoiceNumber}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {inv.project.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900">
                  {inv.currency} {inv.total.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">
                  Due {new Date(inv.dueDate).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}
              >
                {cfg.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
