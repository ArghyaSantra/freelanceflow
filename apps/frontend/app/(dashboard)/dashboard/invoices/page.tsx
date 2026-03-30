"use client";

import { useState, useEffect, useCallback } from "react";
import { invoicesApi } from "@/lib/api";
import { Invoice } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import InvoiceList from "@/components/invoices/InvoiceList";
import CreateInvoiceDialog from "@/components/invoices/CreateInvoiceDialog";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await invoicesApi.list();
      setInvoices(response.data);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 mt-1">
            {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}
          </p>
        </div>
        <CreateInvoiceDialog onSuccess={fetchInvoices} />
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <InvoiceList invoices={invoices} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
