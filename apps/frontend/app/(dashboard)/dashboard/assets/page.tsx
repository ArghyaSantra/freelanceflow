"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Asset } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageIcon, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const assetStatusConfig = {
  PENDING: {
    label: "Pending",
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

export default function AssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // fetch projects for the filter dropdown
  useEffect(() => {
    api
      .get("/projects")
      .then((res) => {
        setProjects(res.data);
        if (res.data.length > 0) {
          setSelectedProject(res.data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // fetch assets when project changes
  useEffect(() => {
    if (!selectedProject) return;
    setIsLoading(true);
    api
      .get("/assets", { params: { projectId: selectedProject } })
      .then((res) => setAssets(res.data.assets))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [selectedProject]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Assets</h1>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedProject ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ImageIcon className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">
            Select a project to view assets
          </p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ImageIcon className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">
            No assets for this project yet
          </p>
          <p className="text-slate-400 text-xs mt-1">
            Upload assets from the project detail page
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map((asset) => {
            const status = assetStatusConfig[asset.status];
            const Icon = status.icon;
            return (
              <div
                key={asset.id}
                className="rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-sm transition-shadow bg-white"
                onClick={() => router.push(`/dashboard/assets/${asset.id}`)}
              >
                <div className="aspect-square bg-slate-100 overflow-hidden">
                  {asset.viewUrl ? (
                    <img
                      src={asset.viewUrl}
                      alt={asset.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {asset.title}
                  </p>
                  {asset.client && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {asset.client.name}
                    </p>
                  )}
                  <Badge className={cn("text-xs gap-1 mt-2", status.className)}>
                    <Icon className="w-3 h-3" />
                    {status.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
