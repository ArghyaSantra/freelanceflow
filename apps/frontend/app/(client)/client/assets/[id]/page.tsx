"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { clientPortalApi } from "@/lib/clientApi";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Send } from "lucide-react";

interface Comment {
  id: string;
  authorType: "FREELANCER" | "CLIENT";
  content: string;
  createdAt: string;
}
interface Asset {
  id: string;
  title: string;
  description: string | null;
  status: string;
  viewUrl: string;
  type: "IMAGE" | "VIDEO";
  project: { id: string; name: string };
  comments: Comment[];
}

export default function ClientAssetDetailPage() {
  const { id } = useParams();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [rejectComment, setRejectComment] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const fetchAsset = () => {
    setLoading(true);
    clientPortalApi
      .getAssets()
      .then((res) => {
        const found = res.data.assets.find((a: Asset) => a.id === id);
        setAsset(found ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAsset();
  }, [id]);

  // add escape key useEffect (add after the existing fetchAsset useEffect)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleApprove = async () => {
    if (!asset) return;
    setSubmitting(true);
    try {
      await clientPortalApi.approveAsset(asset.id);
      fetchAsset();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!asset) return;
    setSubmitting(true);
    try {
      await clientPortalApi.rejectAsset(asset.id, rejectComment || undefined);
      setShowRejectInput(false);
      setRejectComment("");
      fetchAsset();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleComment = async () => {
    if (!asset || !comment.trim()) return;
    setSubmitting(true);
    try {
      await clientPortalApi.addComment(asset.id, comment.trim());
      setComment("");
      fetchAsset();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        <div className="flex-1 bg-white rounded-xl border border-slate-200 animate-pulse" />
        <div className="w-80 bg-white rounded-xl border border-slate-200 animate-pulse" />
      </div>
    );
  if (!asset) return <p className="text-slate-500 text-sm">Asset not found.</p>;

  const isPending = asset.status === "PENDING";
  const isApproved = asset.status === "APPROVED";
  const isRejected = asset.status === "REJECTED";

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/client/assets"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {asset.title}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {asset.project.name}
            </p>
          </div>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            isApproved
              ? "text-green-600 bg-green-50"
              : isRejected
                ? "text-red-600 bg-red-50"
                : "text-amber-600 bg-amber-50"
          }`}
        >
          {isApproved
            ? "Approved"
            : isRejected
              ? "Rejected"
              : "Awaiting Review"}
        </span>
      </div>

      {/* Two-column body */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Image */}
        {/* Image */}
        {/* Media */}
        <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
          {asset.type === "VIDEO" ? (
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

        {/* Fullscreen overlay — images only */}
        {fullscreen && asset.type !== "VIDEO" && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-zoom-out"
            onClick={() => setFullscreen(false)}
          >
            <img
              src={asset.viewUrl}
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
        {/* Right panel */}
        <div className="w-80 shrink-0 flex flex-col gap-3 overflow-y-auto">
          {/* Approve / Reject */}
          {isPending && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shrink-0">
              <p className="text-sm font-medium text-slate-700">
                Review this asset
              </p>
              {!showRejectInput ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={submitting}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    disabled={submitting}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    placeholder="Reason (optional)"
                    rows={2}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReject}
                      disabled={submitting}
                      className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => {
                        setShowRejectInput(false);
                        setRejectComment("");
                      }}
                      className="px-3 py-2 text-slate-600 text-sm rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col flex-1 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 shrink-0">
              <p className="text-sm font-medium text-slate-700">Comments</p>
              {asset.description && (
                <p className="text-xs text-slate-400 mt-1">
                  {asset.description}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {asset.comments.length === 0 ? (
                <p className="text-sm text-slate-400">No comments yet.</p>
              ) : (
                asset.comments.map((c) => (
                  <div
                    key={c.id}
                    className={`flex gap-2 ${c.authorType === "CLIENT" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                        c.authorType === "CLIENT"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {c.authorType === "CLIENT" ? "Y" : "F"}
                    </div>
                    <div
                      className={`max-w-[200px] px-3 py-2 rounded-xl text-sm ${
                        c.authorType === "CLIENT"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {c.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-3 border-t border-slate-100 flex gap-2 shrink-0">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                placeholder="Add a comment..."
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <button
                onClick={handleComment}
                disabled={submitting || !comment.trim()}
                className="px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
