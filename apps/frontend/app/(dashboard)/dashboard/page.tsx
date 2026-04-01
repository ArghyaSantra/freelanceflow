"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { clientsApi, projectsApi, documentsApi, invoicesApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  FolderOpen,
  FileText,
  Receipt,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface DashboardStats {
  totalClients: number;
  activeProjects: number;
  pendingDocuments: number;
  totalRevenue: number;
  paidInvoices: number;
  overdueInvoices: number;
  pendingInvoices: number;
}

export default function DashboardPage() {
  const { workspace } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [clientsRes, projectsRes, documentsRes, invoicesRes] =
          await Promise.all([
            clientsApi.list(),
            projectsApi.list({ status: "ACTIVE" }),
            documentsApi.list(),
            invoicesApi.list(),
          ]);

        const clients = clientsRes.data;
        const projects = projectsRes.data;
        const documents = documentsRes.data;
        const invoices = invoicesRes.data;

        const paidInvoices = invoices.filter(
          (inv: { status: string }) => inv.status === "PAID",
        );
        const overdueInvoices = invoices.filter(
          (inv: { status: string }) => inv.status === "OVERDUE",
        );
        const pendingInvoices = invoices.filter(
          (inv: { status: string }) =>
            inv.status === "SENT" || inv.status === "VIEWED",
        );
        const pendingDocuments = documents.filter(
          (doc: { status: string }) =>
            doc.status === "SENT" || doc.status === "VIEWED",
        );

        const totalRevenue = paidInvoices.reduce(
          (sum: number, inv: { total: number }) => sum + inv.total,
          0,
        );

        setStats({
          totalClients: clients.length,
          activeProjects: projects.length,
          pendingDocuments: pendingDocuments.length,
          totalRevenue,
          paidInvoices: paidInvoices.length,
          overdueInvoices: overdueInvoices.length,
          pendingInvoices: pendingInvoices.length,
        });
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Clients",
      value: stats?.totalClients ?? 0,
      icon: Users,
      description: "Active clients",
    },
    {
      title: "Active Projects",
      value: stats?.activeProjects ?? 0,
      icon: FolderOpen,
      description: "In progress",
    },
    {
      title: "Pending Signatures",
      value: stats?.pendingDocuments ?? 0,
      icon: FileText,
      description: "Awaiting signature",
    },
    {
      title: "Total Revenue",
      value: `₹${(stats?.totalRevenue ?? 0).toLocaleString("en-IN")}`,
      icon: TrendingUp,
      description: "From paid invoices",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Good morning 👋</h1>
        <p className="text-slate-500 mt-1">
          Here&apos;s what&apos;s happening with {workspace?.name}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-slate-900">
                  {stat.value}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Invoice summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Paid invoices</p>
              {isLoading ? (
                <Skeleton className="h-6 w-8 mt-1" />
              ) : (
                <p className="text-xl font-bold text-slate-900">
                  {stats?.paidInvoices ?? 0}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending payment</p>
              {isLoading ? (
                <Skeleton className="h-6 w-8 mt-1" />
              ) : (
                <p className="text-xl font-bold text-slate-900">
                  {stats?.pendingInvoices ?? 0}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Overdue invoices</p>
              {isLoading ? (
                <Skeleton className="h-6 w-8 mt-1" />
              ) : (
                <p className="text-xl font-bold text-slate-900">
                  {stats?.overdueInvoices ?? 0}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty state if no data */}
      {!isLoading &&
        stats?.totalClients === 0 &&
        stats?.activeProjects === 0 && (
          <Card className="border-slate-200">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Receipt className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">
                Welcome to FreelanceFlow
              </h3>
              <p className="text-sm text-slate-500 text-center max-w-sm">
                Start by adding a client, creating a project, and sending your
                first document or invoice.
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
