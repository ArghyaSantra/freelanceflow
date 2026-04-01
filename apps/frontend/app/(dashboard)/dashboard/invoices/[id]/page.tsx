"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { invoicesApi } from "@/lib/api";
import { Invoice } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusConfig = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  SENT: { label: "Sent", className: "bg-blue-100 text-blue-700" },
  VIEWED: { label: "Viewed", className: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "Paid", className: "bg-green-100 text-green-700" },
  OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Cancelled", className: "bg-slate-100 text-slate-500" },
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchInvoice = async () => {
    try {
      const response = await invoicesApi.get(id);
      setInvoice(response.data);
    } catch {
      router.push("/dashboard/invoices");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleSend = async () => {
    setIsSending(true);
    try {
      await invoicesApi.send(id);
      toast.success("Invoice sent successfully");
      fetchInvoice();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to send invoice";
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkPaid = async () => {
    setIsMarkingPaid(true);
    try {
      await invoicesApi.markPaid(id);
      toast.success("Invoice marked as paid");
      fetchInvoice();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to mark as paid";
      toast.error(message);
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await invoicesApi.cancel(id);
      toast.success("Invoice cancelled");
      fetchInvoice();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to cancel invoice";
      toast.error(message);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!invoice) return null;

  const status = statusConfig[invoice.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/invoices")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {invoice.invoiceNumber}
            </h1>
            {invoice.project && (
              <p className="text-slate-500">
                {invoice.project.name}
                {invoice.project.client
                  ? ` — ${invoice.project.client.name}`
                  : ""}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Badge className={cn("text-sm px-3 py-1", status.className)}>
            {status.label}
          </Badge>

          {invoice.status === "DRAFT" && (
            <Button onClick={handleSend} disabled={isSending}>
              <Send className="w-4 h-4 mr-2" />
              {isSending ? "Sending..." : "Send Invoice"}
            </Button>
          )}

          {(invoice.status === "SENT" ||
            invoice.status === "VIEWED" ||
            invoice.status === "OVERDUE") && (
            <Button
              variant="outline"
              onClick={handleMarkPaid}
              disabled={isMarkingPaid}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isMarkingPaid ? "Updating..." : "Mark as Paid"}
            </Button>
          )}

          {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isCancelling}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {isCancelling ? "Cancelling..." : "Cancel"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Invoice details */}
        <div className="md:col-span-2 space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 pb-2 border-b border-slate-100">
                  <span className="col-span-6">Description</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-2 text-right">Rate</span>
                  <span className="col-span-2 text-right">Amount</span>
                </div>

                {/* Line items */}
                {(
                  invoice.lineItems as Array<{
                    description: string;
                    quantity: number;
                    unitPrice: number;
                    amount: number;
                  }>
                ).map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 text-sm py-2 border-b border-slate-50"
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
                <div className="pt-3 space-y-2">
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
                  <div className="flex justify-between font-semibold text-slate-900">
                    <span>Total</span>
                    <span>₹{invoice.total.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {invoice.notes && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar details */}
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <Badge className={cn("text-xs", status.className)}>
                  {status.label}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Issue date</span>
                <span className="text-slate-900">
                  {format(new Date(invoice.issueDate), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Due date</span>
                <span className="text-slate-900">
                  {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                </span>
              </div>
              {invoice.sentAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Sent</span>
                  <span className="text-slate-900">
                    {format(new Date(invoice.sentAt), "MMM d, yyyy")}
                  </span>
                </div>
              )}
              {invoice.paidAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Paid</span>
                  <span className="text-green-600 font-medium">
                    {format(new Date(invoice.paidAt), "MMM d, yyyy")}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Currency</span>
                <span className="text-slate-900">{invoice.currency}</span>
              </div>
            </CardContent>
          </Card>

          {invoice.project?.client && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium text-slate-900">
                  {invoice.project.client.name}
                </p>
                <p className="text-sm text-slate-500">
                  {invoice.project.client.email}
                </p>
                {invoice.project.client.company && (
                  <p className="text-sm text-slate-500">
                    {invoice.project.client.company}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Amount</p>
                  <p className="text-xl font-bold text-slate-900">
                    ₹{invoice.total.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
