"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { clientPortalApi } from "@/lib/clientApi";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}
interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes: string | null;
  paidAt: string | null;
  project: { id: string; name: string };
  workspace: {
    name: string;
    gstin: string | null;
    invoiceFooter: string | null;
  };
}

export default function ClientInvoiceDetailPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientPortalApi
      .getInvoice(id as string)
      .then((res) => setInvoice(res.data.invoice))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" />
    );
  if (!invoice)
    return <p className="text-slate-500 text-sm">Invoice not found.</p>;

  const isPaid = invoice.status === "PAID";
  const isOverdue = invoice.status === "OVERDUE";

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/client/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={14} /> Back to Invoices
      </Link>
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {invoice.invoiceNumber}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {invoice.project.name}
            </p>
          </div>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${isPaid ? "text-green-600 bg-green-50" : isOverdue ? "text-red-600 bg-red-50" : "text-blue-600 bg-blue-50"}`}
          >
            {invoice.status.charAt(0) + invoice.status.slice(1).toLowerCase()}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">
              Issue Date
            </p>
            <p className="text-slate-700">
              {new Date(invoice.issueDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">
              Due Date
            </p>
            <p
              className={`font-medium ${isOverdue ? "text-red-600" : "text-slate-700"}`}
            >
              {new Date(invoice.dueDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs text-slate-400 uppercase tracking-wide pb-2">
                Description
              </th>
              <th className="text-right text-xs text-slate-400 uppercase tracking-wide pb-2">
                Qty
              </th>
              <th className="text-right text-xs text-slate-400 uppercase tracking-wide pb-2">
                Rate
              </th>
              <th className="text-right text-xs text-slate-400 uppercase tracking-wide pb-2">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {invoice.lineItems.map((item, i) => (
              <tr key={i}>
                <td className="py-2 text-slate-700">{item.description}</td>
                <td className="py-2 text-right text-slate-500">
                  {item.quantity}
                </td>
                <td className="py-2 text-right text-slate-500">
                  {item.rate.toLocaleString()}
                </td>
                <td className="py-2 text-right text-slate-700">
                  {item.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>
              {invoice.currency} {invoice.subtotal.toLocaleString()}
            </span>
          </div>
          {invoice.taxRate > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Tax ({invoice.taxRate}%)</span>
              <span>
                {invoice.currency} {invoice.taxAmount.toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-slate-900 text-base pt-1">
            <span>Total</span>
            <span>
              {invoice.currency} {invoice.total.toLocaleString()}
            </span>
          </div>
        </div>
        {invoice.notes && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
              Notes
            </p>
            <p className="text-sm text-slate-600">{invoice.notes}</p>
          </div>
        )}
        {invoice.workspace.invoiceFooter && (
          <p className="text-xs text-slate-400 border-t border-slate-100 pt-4">
            {invoice.workspace.invoiceFooter}
          </p>
        )}
      </div>
      {isPaid && (
        <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 px-4 py-3 rounded-lg">
          <CheckCircle size={16} />
          Paid on {new Date(invoice.paidAt!).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
