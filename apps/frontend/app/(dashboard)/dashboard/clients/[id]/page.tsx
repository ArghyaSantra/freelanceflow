"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { clientsApi, projectsApi } from "@/lib/api";
import { Client, Project } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import CreateProjectDialog from "@/components/projects/CreateProjectDialog";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Building2,
  FolderOpen,
  FileText,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter as useNavRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const statusConfig = {
  ACTIVE: { label: "Active", className: "bg-green-100 text-green-700" },
  COMPLETED: { label: "Completed", className: "bg-blue-100 text-blue-700" },
  ARCHIVED: { label: "Archived", className: "bg-slate-100 text-slate-600" },
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [clientRes, projectsRes] = await Promise.all([
        clientsApi.get(id),
        projectsApi.list({ clientId: id }),
      ]);
      setClient(clientRes.data);
      setProjects(projectsRes.data);
    } catch {
      router.push("/dashboard/clients");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/clients")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-medium">
            {client.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
            {client.company && (
              <p className="text-slate-500">{client.company}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" />
              {client.email}
            </div>
            {client.phone && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="w-4 h-4 text-slate-400" />
                {client.phone}
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400" />
                {client.address}
              </div>
            )}
            {client.company && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Building2 className="w-4 h-4 text-slate-400" />
                {client.company}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total projects</p>
                <p className="text-2xl font-bold text-slate-900">
                  {projects.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Receipt className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Member since</p>
                <p className="text-lg font-bold text-slate-900">
                  {format(new Date(client.createdAt), "MMM yyyy")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Projects</CardTitle>
          <CreateProjectDialog onSuccess={fetchData} defaultClientId={id} />
        </CardHeader>
        <CardContent className="p-0">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="w-8 h-8 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No projects yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {projects.map((project) => {
                const status = statusConfig[project.status];
                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer"
                    onClick={() =>
                      router.push(`/dashboard/projects/${project.id}`)
                    }
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {project.name}
                      </p>
                      {project.description && (
                        <p className="text-sm text-slate-500 mt-0.5">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <FileText className="w-3 h-3" />
                        {project._count?.documents ?? 0}
                        <Receipt className="w-3 h-3 ml-1" />
                        {project._count?.invoices ?? 0}
                      </div>
                      <Badge className={cn("text-xs", status.className)}>
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
