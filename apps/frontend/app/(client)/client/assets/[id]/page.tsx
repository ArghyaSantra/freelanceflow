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
      <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" />
    );
  if (!asset) return <p className="text-slate-500 text-sm">Asset not found.</p>;

  const isPending = asset.status === "PENDING";
  const isApproved = asset.status === "APPROVED";
  const isRejected = asset.status === "REJECTED";

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/client/assets"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={14} /> Back to Assets
      </Link>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <img
          src={asset.viewUrl}
          alt={asset.title}
          className="w-full object-contain max-h-96"
        />
        <div className="p-5 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {asset.title}
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {asset.project.name}
              </p>
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${isApproved ? "text-green-600 bg-green-50" : isRejected ? "text-red-600 bg-red-50" : "text-amber-600 bg-amber-50"}`}
            >
              {isApproved
                ? "Approved"
                : isRejected
                  ? "Rejected"
                  : "Awaiting Review"}
            </span>
          </div>
          {asset.description && (
            <p className="text-sm text-slate-600">{asset.description}</p>
          )}
        </div>
      </div>

      {isPending && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <p className="text-sm font-medium text-slate-700">
            Review this asset
          </p>
          {!showRejectInput ? (
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <CheckCircle size={15} /> Approve
              </button>
              <button
                onClick={() => setShowRejectInput(true)}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                <XCircle size={15} /> Reject
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Add a reason for rejection (optional)"
                rows={3}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  Confirm Rejection
                </button>
                <button
                  onClick={() => {
                    setShowRejectInput(false);
                    setRejectComment("");
                  }}
                  className="px-4 py-2 text-slate-600 text-sm rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <p className="text-sm font-medium text-slate-700">Comments</p>
        {asset.comments.length === 0 ? (
          <p className="text-sm text-slate-400">No comments yet.</p>
        ) : (
          <div className="space-y-3">
            {asset.comments.map((c) => (
              <div
                key={c.id}
                className={`flex gap-3 ${c.authorType === "CLIENT" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${c.authorType === "CLIENT" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  {c.authorType === "CLIENT" ? "Y" : "F"}
                </div>
                <div
                  className={`max-w-xs px-3 py-2 rounded-xl text-sm ${c.authorType === "CLIENT" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
                >
                  {c.content}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 pt-2 border-t border-slate-100">
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
  );
}
