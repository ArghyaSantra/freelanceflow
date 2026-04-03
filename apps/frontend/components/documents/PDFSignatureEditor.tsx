"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { documentsApi } from "@/lib/api";
import { DocumentField } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, MousePointer, Info } from "lucide-react";
import { toast } from "sonner";

interface PDFSignatureEditorProps {
  documentId: string;
  viewUrl: string;
  existingFields: DocumentField[];
  onFieldsChange: () => void;
  readonly?: boolean;
}

export default function PDFSignatureEditor({
  documentId,
  viewUrl,
  existingFields,
  onFieldsChange,
  readonly = false,
}: PDFSignatureEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fields, setFields] = useState<DocumentField[]>(existingFields);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isPlacing, setIsPlacing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pdfRef = useRef<any>(null);
  const pageRef = useRef<any>(null);
  const scaleRef = useRef(1);

  useEffect(() => {
    setFields(existingFields);
  }, [existingFields]);

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfRef.current || !canvasRef.current) return;

    const page = await pdfRef.current.getPage(pageNum);
    pageRef.current = page;

    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth - 32;
    const viewport = page.getViewport({ scale: 1 });
    const scale = containerWidth / viewport.width;
    scaleRef.current = scale;

    const scaledViewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    await page.render({
      canvasContext: ctx,
      viewport: scaledViewport,
    }).promise;
  }, []);

  useEffect(() => {
    const loadPDF = async () => {
      setIsLoading(true);
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const pdf = await pdfjsLib.getDocument(viewUrl).promise;
        pdfRef.current = pdf;
        setTotalPages(pdf.numPages);
        await renderPage(1);
      } catch (err) {
        console.error("Failed to load PDF:", err);
        toast.error("Failed to load PDF");
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [viewUrl, renderPage]);

  useEffect(() => {
    if (pdfRef.current) {
      renderPage(currentPage);
    }
  }, [currentPage, renderPage]);

  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPlacing || readonly) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // convert to percentage
    const x = parseFloat((clickX / canvas.width).toFixed(4));
    const y = parseFloat((clickY / canvas.height).toFixed(4));
    const width = 0.3;
    const height = 0.08;

    try {
      await documentsApi.createField(documentId, {
        type: "SIGNATURE",
        pageNumber: currentPage,
        x,
        y,
        width,
        height,
      });

      toast.success("Signature field added");
      setIsPlacing(false);
      onFieldsChange();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to add field";
      toast.error(message);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    try {
      await documentsApi.deleteField(documentId, fieldId);
      toast.success("Field removed");
      onFieldsChange();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to remove field";
      toast.error(message);
    }
  };

  const fieldsOnCurrentPage = fields.filter(
    (f) => f.pageNumber === currentPage,
  );

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {!readonly && (
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant={isPlacing ? "default" : "outline"}
            onClick={() => setIsPlacing(!isPlacing)}
            className="gap-2"
          >
            <MousePointer className="w-3 h-3" />
            {isPlacing ? "Click PDF to place field" : "Place Signature Field"}
          </Button>

          {isPlacing && (
            <div className="flex items-center gap-1 text-sm text-blue-600">
              <Info className="w-3 h-3" />
              Click anywhere on the PDF to place a signature field
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline">
              {fields.length} field{fields.length !== 1 ? "s" : ""} placed
            </Badge>
          </div>
        </div>
      )}

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* PDF Canvas with field overlays */}
      <div
        ref={containerRef}
        className="relative border border-slate-200 rounded-lg overflow-hidden bg-slate-100"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
            <p className="text-slate-500 text-sm">Loading PDF...</p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={`block w-full ${isPlacing ? "cursor-crosshair" : "cursor-default"}`}
        />

        {/* Signature field overlays */}
        {!isLoading &&
          fieldsOnCurrentPage.map((field, index) => {
            const canvas = canvasRef.current;
            if (!canvas) return null;

            const left = field.x * 100;
            const top = field.y * 100;
            const width = field.width * 100;
            const height = field.height * 100;

            return (
              <div
                key={field.id}
                className="absolute border-2 border-blue-500 bg-blue-50/70 rounded flex items-center justify-center group"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                }}
              >
                <span className="text-xs text-blue-600 font-medium">
                  Sign here {index + 1}
                </span>
                {!readonly && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteField(field.id);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
