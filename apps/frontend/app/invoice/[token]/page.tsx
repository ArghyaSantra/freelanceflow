"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Building2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PublicInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes?: string;
  paymentLink?: string;
  project: {
    client: {
      name: string;
      email: string;
      company?: string;
    };
    workspace: {
      name: string;
      address?: string;
      gstin?: string;
      pan?: string;
      bankName?: string;
      bankAccountNumber?: string;
      bankIfsc?: string;
      invoiceFooter?: string;
    };
  };
}

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  SENT: { label: "Sent", className: "bg-blue-100 text-blue-700" },
  VIEWED: { label: "Viewed", className: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "Paid", className: "bg-green-100 text-green-700" },
  OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Cancelled", className: "bg-slate-100 text-slate-500" },
};

export default function PublicInvoicePage() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await api.get(`/public/invoice/${token}`);
        setInvoice(response.data);
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "This invoice link is invalid or has expired";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoice();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Invoice unavailable
            </h2>
            <p className="text-slate-500 text-sm">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invoice) return null;

  const status = statusConfig[invoice.status] ?? statusConfig.SENT;
  const workspace = invoice.project.workspace;
  const client = invoice.project.client;
  const isPaid = invoice.status === "PAID";

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900">
              {workspace.name}
            </span>
          </div>
          <Badge className={cn("text-sm px-3 py-1", status.className)}>
            {isPaid && <CheckCircle className="w-3 h-3 mr-1" />}
            {status.label}
          </Badge>
        </div>

        {/* Invoice card */}
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {invoice.invoiceNumber}
                </CardTitle>
                <p className="text-slate-500 text-sm mt-1">
                  Issued {format(new Date(invoice.issueDate), "MMM d, yyyy")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-slate-900">
                  ₹{invoice.total.toLocaleString("en-IN")}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Due {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* From / To */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                  From
                </p>
                <p className="font-medium text-slate-900">{workspace.name}</p>
                {workspace.address && (
                  <p className="text-sm text-slate-500 mt-1">
                    {workspace.address}
                  </p>
                )}
                {workspace.gstin && (
                  <p className="text-sm text-slate-500">
                    GSTIN: {workspace.gstin}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                  To
                </p>
                <p className="font-medium text-slate-900">{client.name}</p>
                {client.company && (
                  <p className="text-sm text-slate-500">{client.company}</p>
                )}
                <p className="text-sm text-slate-500">{client.email}</p>
              </div>
            </div>

            <Separator />

            {/* Line items */}
            <div>
              <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 pb-2 border-b border-slate-100">
                <span className="col-span-6">Description</span>
                <span className="col-span-2 text-right">Qty</span>
                <span className="col-span-2 text-right">Rate</span>
                <span className="col-span-2 text-right">Amount</span>
              </div>

              {invoice.lineItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 text-sm py-3 border-b border-slate-50"
                >
                  <span className="col-span-6 text-slate-700">
                    {item.description}
                  </span>
                  <span className="col-span-2 text-right text-slate-600">
                    {item.quantity}
                  </span>
                  <span className="col-span-2 text-right text-slate-600">
                    ₹{item.unitPrice.toLocaleString("en-IN")}
                  </span>
                  <span className="col-span-2 text-right font-medium text-slate-900">
                    ₹{item.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}

              {/* Totals */}
              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>₹{invoice.subtotal.toLocaleString("en-IN")}</span>
                </div>
                {invoice.taxRate > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>GST ({invoice.taxRate}%)</span>
                    <span>₹{invoice.taxAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-slate-900 text-lg">
                  <span>Total</span>
                  <span>₹{invoice.total.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Bank details */}
            {workspace.bankName && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
                    Bank Details
                  </p>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p>Bank: {workspace.bankName}</p>
                    {workspace.bankAccountNumber && (
                      <p>Account: {workspace.bankAccountNumber}</p>
                    )}
                    {workspace.bankIfsc && <p>IFSC: {workspace.bankIfsc}</p>}
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {invoice.notes && (
              <>
                <Separator />
                <p className="text-sm text-slate-500">{invoice.notes}</p>
              </>
            )}

            {/* Footer */}
            {workspace.invoiceFooter && (
              <p className="text-xs text-slate-400 text-center">
                {workspace.invoiceFooter}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pay button */}
        {!isPaid && invoice.paymentLink && (
          <Button
            className="w-full h-12 text-base"
            onClick={() => window.open(invoice.paymentLink, "_blank")}
          >
            Pay ₹{invoice.total.toLocaleString("en-IN")} Now
          </Button>
        )}

        {isPaid && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex items-center justify-center gap-2 py-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-700 font-medium">
                This invoice has been paid. Thank you!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
