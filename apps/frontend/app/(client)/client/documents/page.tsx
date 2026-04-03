"use client";

import { useEffect, useState } from "react";
import { clientPortalApi } from "@/lib/clientApi";
import Link from "next/link";
import { FileText, CheckCircle, Clock, Send, Eye } from "lucide-react";

interface Document {
  id: string;
  title: string;
  status: string;
  sentAt: string | null;
  signedAt: string | null;
  project: { id: string; name: string };
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  DRAFT: {
    label: "Draft",
    color: "text-slate-500 bg-slate-100",
    icon: FileText,
  },
  SENT: {
    label: "Awaiting Signature",
    color: "text-blue-600 bg-blue-50",
    icon: Send,
  },
  VIEWED: { label: "Viewed", color: "text-amber-600 bg-amber-50", icon: Eye },
  SIGNED: {
    label: "Signed",
    color: "text-green-600 bg-green-50",
    icon: CheckCircle,
  },
  EXPIRED: { label: "Expired", color: "text-red-600 bg-red-50", icon: Clock },
  CANCELLED: {
    label: "Cancelled",
    color: "text-slate-400 bg-slate-100",
    icon: FileText,
  },
};

export default function ClientDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientPortalApi
      .getDocuments()
      .then((res) => setDocuments(res.data.documents))
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

  if (documents.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText size={40} className="text-slate-300 mb-3" />
        <p className="text-slate-500 text-sm">No documents yet</p>
      </div>
    );

  return (
    <div className="space-y-3 max-w-3xl">
      {documents.map((doc) => {
        const cfg = statusConfig[doc.status] ?? statusConfig.DRAFT;
        const Icon = cfg.icon;
        return (
          <Link
            key={doc.id}
            href={`/client/documents/${doc.id}`}
            className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-5 py-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-slate-100 rounded-lg">
                <FileText size={18} className="text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {doc.title}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {doc.project.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {doc.sentAt && (
                <p className="text-xs text-slate-400 hidden sm:block">
                  Sent {new Date(doc.sentAt).toLocaleDateString()}
                </p>
              )}
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}
              >
                <Icon size={12} />
                {cfg.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
