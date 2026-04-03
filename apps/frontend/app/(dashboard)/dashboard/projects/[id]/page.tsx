"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectsApi, api } from "@/lib/api";
import { Project, Document, Invoice, Asset } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UploadDocumentDialog from "@/components/documents/UploadDocumentDialog";
import CreateInvoiceDialog from "@/components/invoices/CreateInvoiceDialog";
import UploadAssetDialog from "@/components/assets/UploadAssetDialog";
import {
  ArrowLeft,
  FileText,
  Receipt,
  ChevronRight,
  ImageIcon,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const docStatusConfig = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  SENT: { label: "Sent", className: "bg-blue-100 text-blue-700" },
  VIEWED: { label: "Viewed", className: "bg-yellow-100 text-yellow-700" },
  SIGNED: { label: "Signed", className: "bg-green-100 text-green-700" },
  EXPIRED: { label: "Expired", className: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Cancelled", className: "bg-slate-100 text-slate-500" },
};

const invStatusConfig = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  SENT: { label: "Sent", className: "bg-blue-100 text-blue-700" },
  VIEWED: { label: "Viewed", className: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "Paid", className: "bg-green-100 text-green-700" },
  OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Cancelled", className: "bg-slate-100 text-slate-500" },
};

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

type ProjectDetail = Project & {
  documents: Document[];
  invoices: Invoice[];
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProject = async () => {
    try {
      const response = await projectsApi.get(id);
      setProject(response.data);
    } catch {
      router.push("/dashboard/projects");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await api.get("/assets", { params: { projectId: id } });
      setAssets(response.data.assets);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchProject();
    fetchAssets();
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!project) return null;

  // clients for this project — just the project's own client
  const projectClients = project.client ? [project.client] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/projects")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          {project.client && (
            <p
              className="text-slate-500 hover:text-slate-700 cursor-pointer"
              onClick={() =>
                router.push(`/dashboard/clients/${project.client!.id}`)
              }
            >
              {project.client.name}
              {project.client.company ? ` — ${project.client.company}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">
            Documents ({project.documents?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices ({project.invoices?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="assets">Assets ({assets.length})</TabsTrigger>
        </TabsList>

        {/* Documents tab — unchanged */}
        <TabsContent value="documents" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Documents</CardTitle>
              <UploadDocumentDialog onSuccess={fetchProject} />
            </CardHeader>
            <CardContent className="p-0">
              {project.documents?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">No documents yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {project.documents?.map((doc) => {
                    const status = docStatusConfig[doc.status];
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer"
                        onClick={() =>
                          router.push(`/dashboard/documents/${doc.id}`)
                        }
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="font-medium text-slate-900">
                              {doc.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {format(new Date(doc.createdAt), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-xs", status.className)}>
                            {status.label}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices tab — unchanged */}
        <TabsContent value="invoices" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Invoices</CardTitle>
              <CreateInvoiceDialog onSuccess={fetchProject} />
            </CardHeader>
            <CardContent className="p-0">
              {project.invoices?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Receipt className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">No invoices yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {project.invoices?.map((invoice) => {
                    const status = invStatusConfig[invoice.status];
                    return (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer"
                        onClick={() =>
                          router.push(`/dashboard/invoices/${invoice.id}`)
                        }
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {invoice.invoiceNumber}
                          </p>
                          <p className="text-xs text-slate-500">
                            Due{" "}
                            {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">
                            ₹{invoice.total.toLocaleString("en-IN")}
                          </span>
                          <Badge className={cn("text-xs", status.className)}>
                            {status.label}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assets tab — new */}
        <TabsContent value="assets" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Assets</CardTitle>
              <UploadAssetDialog
                projectId={id}
                clients={projectClients}
                onSuccess={fetchAssets}
              />
            </CardHeader>
            <CardContent className="p-0">
              {assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <ImageIcon className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">No assets yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4">
                  {assets.map((asset) => {
                    const status = assetStatusConfig[asset.status];
                    const Icon = status.icon;
                    return (
                      <div
                        key={asset.id}
                        className="rounded-lg border border-slate-200 overflow-hidden cursor-pointer hover:shadow-sm transition-shadow"
                        onClick={() =>
                          router.push(`/dashboard/assets/${asset.id}`)
                        }
                      >
                        <div className="aspect-square bg-slate-100 overflow-hidden relative">
                          {asset.type === "VIDEO" ? (
                            <>
                              <video
                                src={asset.viewUrl}
                                className="w-full h-full object-cover"
                                muted
                                preload="metadata"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                                  <svg
                                    className="w-4 h-4 text-slate-800 ml-0.5"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                              </div>
                            </>
                          ) : asset.viewUrl ? (
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
                          <div className="flex items-center gap-1 mt-1">
                            <Badge
                              className={cn("text-xs gap-1", status.className)}
                            >
                              <Icon className="w-3 h-3" />
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
