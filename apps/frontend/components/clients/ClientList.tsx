"use client";

import { Client } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Mail, Phone, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface ClientListProps {
  clients: Client[];
}

export default function ClientList({ clients }: ClientListProps) {
  const router = useRouter();

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Building2 className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="font-semibold text-slate-900 mb-1">No clients yet</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Add your first client to start managing projects, documents and
          invoices.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Added</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow
            key={client.id}
            className="cursor-pointer hover:bg-slate-50"
            onClick={() => router.push(`/dashboard/clients/${client.id}`)}
          >
            <TableCell>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white text-xs font-medium">
                  {client.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="font-medium text-slate-900">
                  {client.name}
                </span>
              </div>
            </TableCell>
            <TableCell>
              {client.company ? (
                <span className="text-slate-600">{client.company}</span>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  <Mail className="w-3 h-3" />
                  {client.email}
                </div>
                {client.phone && (
                  <div className="flex items-center gap-1 text-sm text-slate-500">
                    <Phone className="w-3 h-3" />
                    {client.phone}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell className="text-slate-500 text-sm">
              {format(new Date(client.createdAt), "MMM d, yyyy")}
            </TableCell>
            <TableCell>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
