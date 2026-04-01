"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { documentsApi } from "@/lib/api";
import { Document } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Send,
  ExternalLink,
  Download,
  FileText,
  CheckCircle,
  Clock,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusConfig = {
  DRAFT: {
    label: "Draft",
    className: "bg-slate-100 text-slate-600",
    icon: FileText,
  },
  SENT: {
    label: "Sent",
    className: "bg-blue-100 text-blue-700",
    icon: Send,
  },
  VIEWED: {
    label: "Viewed",
    className: "bg-yellow-100 text-yellow-700",
    icon: Eye,
  },
  SIGNED: {
    label: "Signed",
    className: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  EXPIRED: {
    label: "Expired",
    className: "bg-red-100 text-red-700",
    icon: Clock,
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-500",
    icon: FileText,
  },
};

type DocumentDetail = Document & { viewUrl?: string; signedViewUrl?: string };

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [document, setDocument] = useState<DocumentDetail | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const fetchDocument = async () => {
    try {
      const response = await documentsApi.get(id);
      console.log({ response });
      setDocument(response.data);
    } catch {
      router.push("/dashboard/documents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const handleSend = async () => {
    if (!document) return;

    if (document.documentFields?.length === 0) {
      toast.error("Add at least one signature field before sending");
      return;
    }

    setIsSending(true);
    try {
      const response = await documentsApi.send(id);
      const { signingLink } = response.data;
      toast.success("Document sent for signing");
      setDocument((prev) => (prev ? { ...prev, status: "SENT" } : prev));
      // copy signing link to clipboard
      await navigator.clipboard.writeText(signingLink);
      toast.info("Signing link copied to clipboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to send document";
      toast.error(message);
    } finally {
      setIsSending(false);
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

  if (!document) return null;

  const status = statusConfig[document.status];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/documents")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {document.title}
            </h1>
            {document.project && (
              <p className="text-slate-500">{document.project.name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={cn("text-sm px-3 py-1", status.className)}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {status.label}
          </Badge>

          {document.status === "DRAFT" && (
            <Button onClick={handleSend} disabled={isSending}>
              <Send className="w-4 h-4 mr-2" />
              {isSending ? "Sending..." : "Send for signing"}
            </Button>
          )}

          {document.viewUrl && (
            <Button
              variant="outline"
              onClick={() => window.open(document.viewUrl, "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View PDF
            </Button>
          )}

          {document.signedFileUrl && (
            <Button
              variant="outline"
              onClick={() => window.open(document.signedViewUrl, "_blank")}
            >
              <Download className="w-4 h-4 mr-2" />
              Download signed
            </Button>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Document details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Status</span>
              <Badge className={cn("text-xs", status.className)}>
                {status.label}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Created</span>
              <span className="text-slate-900">
                {format(new Date(document.createdAt), "MMM d, yyyy")}
              </span>
            </div>
            {document.sentAt && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Sent</span>
                <span className="text-slate-900">
                  {format(new Date(document.sentAt), "MMM d, yyyy h:mm a")}
                </span>
              </div>
            )}
            {document.signerEmail && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Signer</span>
                <span className="text-slate-900">{document.signerEmail}</span>
              </div>
            )}
            {document.signedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Signed</span>
                <span className="text-slate-900">
                  {format(new Date(document.signedAt), "MMM d, yyyy h:mm a")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Signature fields</CardTitle>
          </CardHeader>
          <CardContent>
            {document.documentFields?.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  No signature fields added yet
                </p>
                {document.status === "DRAFT" && (
                  <p className="text-xs text-slate-400 mt-1">
                    Signature field placement UI coming soon
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {document.documentFields?.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded"
                  >
                    <span className="text-slate-600">
                      Field {index + 1} — Page {field.pageNumber}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {field.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
