"use client";

import { Invoice } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusConfig = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  SENT: { label: "Sent", className: "bg-blue-100 text-blue-700" },
  VIEWED: { label: "Viewed", className: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "Paid", className: "bg-green-100 text-green-700" },
  OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Cancelled", className: "bg-slate-100 text-slate-500" },
};

interface InvoiceListProps {
  invoices: Invoice[];
}

export default function InvoiceList({ invoices }: InvoiceListProps) {
  const router = useRouter();

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Receipt className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="font-semibold text-slate-900 mb-1">No invoices yet</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Create your first invoice to start collecting payments from clients.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => {
          const status = statusConfig[invoice.status];
          return (
            <TableRow
              key={invoice.id}
              className="cursor-pointer hover:bg-slate-50"
              onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
            >
              <TableCell>
                <span className="font-medium text-slate-900">
                  {invoice.invoiceNumber}
                </span>
              </TableCell>
              <TableCell>
                {invoice.project?.client ? (
                  <span className="text-slate-600">
                    {invoice.project.client.name}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge className={cn("text-xs", status.className)}>
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="font-medium text-slate-900">
                  ₹{invoice.total.toLocaleString("en-IN")}
                </span>
              </TableCell>
              <TableCell className="text-slate-500 text-sm">
                {format(new Date(invoice.dueDate), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
