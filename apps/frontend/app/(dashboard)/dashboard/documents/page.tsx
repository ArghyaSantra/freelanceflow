"use client";

import { useState, useEffect, useCallback } from "react";
import { documentsApi } from "@/lib/api";
import { Document } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DocumentList from "@/components/documents/DocumentList";
import UploadDocumentDialog from "@/components/documents/UploadDocumentDialog";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await documentsApi.list();
      setDocuments(response.data);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <p className="text-slate-500 mt-1">
            {documents.length}{" "}
            {documents.length === 1 ? "document" : "documents"}
          </p>
        </div>
        <UploadDocumentDialog onSuccess={fetchDocuments} />
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <DocumentList documents={documents} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
