"use client";

import { useEffect, useState } from "react";
import { clientPortalApi } from "@/lib/clientApi";
import Link from "next/link";
import { ImageIcon, CheckCircle, XCircle, Clock } from "lucide-react";

interface Asset {
  id: string;
  title: string;
  status: string;
  viewUrl: string;
  project: { id: string; name: string };
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  PENDING: {
    label: "Awaiting Review",
    color: "text-amber-600 bg-amber-50",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    color: "text-green-600 bg-green-50",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Rejected",
    color: "text-red-600 bg-red-50",
    icon: XCircle,
  },
};

export default function ClientAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientPortalApi
      .getAssets()
      .then((res) => setAssets(res.data.assets))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="aspect-square bg-white rounded-xl border border-slate-200 animate-pulse"
          />
        ))}
      </div>
    );

  if (assets.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ImageIcon size={40} className="text-slate-300 mb-3" />
        <p className="text-slate-500 text-sm">No assets yet</p>
      </div>
    );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-4xl">
      {assets.map((asset) => {
        const cfg = statusConfig[asset.status] ?? statusConfig.PENDING;
        const Icon = cfg.icon;
        return (
          <Link
            key={asset.id}
            href={`/client/assets/${asset.id}`}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-sm transition-shadow"
          >
            <div className="aspect-square bg-slate-100 overflow-hidden">
              <img
                src={asset.viewUrl}
                alt={asset.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-slate-900 truncate">
                {asset.title}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {asset.project.name}
              </p>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-2 ${cfg.color}`}
              >
                <Icon size={10} />
                {cfg.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
