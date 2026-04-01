"use client";

import { Project } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FolderOpen, ChevronRight, FileText, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusConfig = {
  ACTIVE: { label: "Active", className: "bg-green-100 text-green-700" },
  COMPLETED: { label: "Completed", className: "bg-blue-100 text-blue-700" },
  ARCHIVED: { label: "Archived", className: "bg-slate-100 text-slate-600" },
};

interface ProjectListProps {
  projects: Project[];
}

export default function ProjectList({ projects }: ProjectListProps) {
  const router = useRouter();

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <FolderOpen className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="font-semibold text-slate-900 mb-1">No projects yet</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Create a project to start managing documents and invoices for a
          client.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Activity</TableHead>
          <TableHead>Created</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => {
          const status = statusConfig[project.status];
          return (
            <TableRow
              key={project.id}
              className="cursor-pointer hover:bg-slate-50"
              onClick={() => router.push(`/dashboard/projects/${project.id}`)}
            >
              <TableCell>
                <span className="font-medium text-slate-900">
                  {project.name}
                </span>
                {project.description && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                    {project.description}
                  </p>
                )}
              </TableCell>
              <TableCell>
                {project.client ? (
                  <div>
                    <p className="text-sm text-slate-700">
                      {project.client.name}
                    </p>
                    {project.client.company && (
                      <p className="text-xs text-slate-400">
                        {project.client.company}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge className={cn("text-xs", status.className)}>
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {project._count?.documents ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Receipt className="w-3 h-3" />
                    {project._count?.invoices ?? 0}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-slate-500 text-sm">
                {format(new Date(project.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
