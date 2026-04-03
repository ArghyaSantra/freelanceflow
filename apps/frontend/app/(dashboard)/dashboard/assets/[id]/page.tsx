"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Asset } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const assetStatusConfig = {
  PENDING: {
    label: "Pending Review",
    className: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    className: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-100 text-red-700",
    icon: XCircle,
  },
};

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const fetchAsset = async () => {
    try {
      const response = await api.get(`/assets/${id}`);
      setAsset(response.data.asset);
    } catch {
      router.push("/dashboard/projects");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAsset();
  }, [id]);

  useEffect(() => {
    fetchAsset();
  }, [id]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/assets/${id}/comments`, { content: comment.trim() });
      setComment("");
      fetchAsset();
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this asset? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.delete(`/assets/${id}`);
      toast.success("Asset deleted");
      router.back();
    } catch {
      toast.error("Failed to delete asset");
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-6 h-[calc(100vh-8rem)]">
        <Skeleton className="flex-1 rounded-xl" />
        <Skeleton className="w-80 rounded-xl" />
      </div>
    );
  }

  if (!asset) return null;

  const status = assetStatusConfig[asset.status];
  const Icon = status.icon;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{asset.title}</h1>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              {asset.project && <span>{asset.project.name}</span>}
              {asset.client && <span>· {asset.client.name}</span>}
              <span>
                · Uploaded {format(new Date(asset.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("gap-1", status.className)}>
            <Icon className="w-3 h-3" />
            {status.label}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Image — takes all remaining space */}
        {/* Image — takes all remaining space */}
        <div
          className="flex-1 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center cursor-zoom-in"
          onClick={() => setFullscreen(true)}
        >
          {asset.viewUrl && asset.type === "VIDEO" ? (
            <video
              src={asset.viewUrl}
              controls
              className="max-w-full max-h-full"
            />
          ) : (
            <img
              src={asset.viewUrl}
              alt={asset.title}
              className="max-w-full max-h-full object-contain cursor-zoom-in"
              onClick={() => setFullscreen(true)}
            />
          )}
        </div>

        {/* Fullscreen overlay */}
        {fullscreen && asset.type !== "VIDEO" && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-zoom-out"
            onClick={() => setFullscreen(false)}
          >
            <img
              src={asset.viewUrl!}
              alt={asset.title}
              className="max-w-[95vw] max-h-[95vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setFullscreen(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              Press Esc or click to close
            </button>
          </div>
        )}

        {/* Right panel — comments */}
        <div className="w-80 shrink-0 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-700">Comments</p>
            {asset.description && (
              <p className="text-xs text-slate-400 mt-1">{asset.description}</p>
            )}
          </div>

          {/* Scrollable comment list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {!asset.comments || asset.comments.length === 0 ? (
              <p className="text-sm text-slate-400">No comments yet.</p>
            ) : (
              asset.comments.map((c) => (
                <div
                  key={c.id}
                  className={`flex gap-2 ${c.authorType === "FREELANCER" ? "" : "flex-row-reverse"}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                      c.authorType === "FREELANCER"
                        ? "bg-slate-900 text-white"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {c.authorType === "FREELANCER" ? "F" : "C"}
                  </div>
                  <div
                    className={`max-w-[200px] px-3 py-2 rounded-xl text-sm ${
                      c.authorType === "FREELANCER"
                        ? "bg-slate-100 text-slate-700"
                        : "bg-blue-50 text-blue-900"
                    }`}
                  >
                    <p>{c.content}</p>
                    <p className="text-xs opacity-50 mt-1">
                      {format(new Date(c.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment input */}
          <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              className="resize-none text-sm flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleComment();
                }
              }}
            />
            <Button
              onClick={handleComment}
              disabled={submitting || !comment.trim()}
              size="icon"
              className="shrink-0 self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
