"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { clientPortalApi } from "@/lib/clientApi";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, CheckCircle } from "lucide-react";

interface Document {
  id: string;
  title: string;
  status: string;
  sentAt: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  viewUrl: string;
  signedViewUrl: string | null;
  project: { id: string; name: string };
}

export default function ClientDocumentDetailPage() {
  const { id } = useParams();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientPortalApi
      .getDocument(id as string)
      .then((res) => setDocument(res.data.document))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse" />
    );
  if (!document)
    return <p className="text-slate-500 text-sm">Document not found.</p>;

  const isSigned = document.status === "SIGNED";

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/client/documents"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={14} /> Back to Documents
      </Link>
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {document.title}
          </h1>
          <p className="text-sm text-slate-400 mt-1">{document.project.name}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">
              Status
            </p>
            <p
              className={`font-medium ${isSigned ? "text-green-600" : "text-blue-600"}`}
            >
              {isSigned
                ? "Signed"
                : document.status.charAt(0) +
                  document.status.slice(1).toLowerCase()}
            </p>
          </div>
          {document.sentAt && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">
                Sent
              </p>
              <p className="text-slate-700">
                {new Date(document.sentAt).toLocaleDateString()}
              </p>
            </div>
          )}
          {document.signedAt && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">
                Signed On
              </p>
              <p className="text-slate-700">
                {new Date(document.signedAt).toLocaleDateString()}
              </p>
            </div>
          )}
          {document.expiresAt && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">
                Expires
              </p>
              <p className="text-slate-700">
                {new Date(document.expiresAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <a
            href={document.viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ExternalLink size={14} /> View Document
          </a>
          {isSigned && document.signedViewUrl && (
            <a
              href={document.signedViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={14} /> Download Signed Copy
            </a>
          )}
        </div>
      </div>
      {isSigned && (
        <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 px-4 py-3 rounded-lg">
          <CheckCircle size={16} /> This document has been signed successfully.
        </div>
      )}
    </div>
  );
}
