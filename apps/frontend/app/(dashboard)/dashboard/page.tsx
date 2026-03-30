"use client";

import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  FolderOpen,
  FileText,
  Receipt,
  TrendingUp,
  Clock,
} from "lucide-react";

const stats = [
  {
    title: "Total Clients",
    value: "0",
    icon: Users,
    description: "Active clients",
  },
  {
    title: "Active Projects",
    value: "0",
    icon: FolderOpen,
    description: "In progress",
  },
  {
    title: "Documents",
    value: "0",
    icon: FileText,
    description: "Sent for signing",
  },
  {
    title: "Revenue",
    value: "₹0",
    icon: TrendingUp,
    description: "This month",
  },
];

export default function DashboardPage() {
  const { workspace, user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Good morning 👋</h1>
        <p className="text-slate-500 mt-1">
          Here&apos;s what&apos;s happening with {workspace?.name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {stat.value}
              </div>
              <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">
            No recent activity
          </h3>
          <p className="text-sm text-slate-500 text-center max-w-sm">
            Start by adding a client, creating a project, and sending your first
            document or invoice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
