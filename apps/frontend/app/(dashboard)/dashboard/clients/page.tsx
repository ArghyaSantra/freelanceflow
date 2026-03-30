"use client";

import { useState, useEffect, useCallback } from "react";
import { clientsApi } from "@/lib/api";
import { Client } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ClientList from "@/components/clients/ClientList";
import CreateClientDialog from "@/components/clients/CreateClientDialog";
import { Users } from "lucide-react";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    try {
      const response = await clientsApi.list();
      setClients(response.data);
    } catch {
      // error handled silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 mt-1">
            {clients.length} {clients.length === 1 ? "client" : "clients"}
          </p>
        </div>
        <CreateClientDialog onSuccess={fetchClients} />
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ClientList clients={clients} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
