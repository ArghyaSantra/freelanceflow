"use client";

import { Document } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusConfig = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  SENT: { label: "Sent", className: "bg-blue-100 text-blue-700" },
  VIEWED: { label: "Viewed", className: "bg-yellow-100 text-yellow-700" },
  SIGNED: { label: "Signed", className: "bg-green-100 text-green-700" },
  EXPIRED: { label: "Expired", className: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Cancelled", className: "bg-slate-100 text-slate-500" },
};

interface DocumentListProps {
  documents: Document[];
}

export default function DocumentList({ documents }: DocumentListProps) {
  const router = useRouter();

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="font-semibold text-slate-900 mb-1">No documents yet</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Upload a PDF contract to send to your client for signing.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Document</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Signed by</TableHead>
          <TableHead>Created</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => {
          const status = statusConfig[doc.status];
          return (
            <TableRow
              key={doc.id}
              className="cursor-pointer hover:bg-slate-50"
              onClick={() => router.push(`/dashboard/documents/${doc.id}`)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-slate-500" />
                  </div>
                  <span className="font-medium text-slate-900">
                    {doc.title}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {doc.project ? (
                  <span className="text-slate-600">{doc.project.name}</span>
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
                {doc.signerEmail ? (
                  <span className="text-sm text-slate-600">
                    {doc.signerEmail}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </TableCell>
              <TableCell className="text-slate-500 text-sm">
                {format(new Date(doc.createdAt), "MMM d, yyyy")}
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
