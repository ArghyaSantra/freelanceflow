"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { documentsApi, projectsApi } from "@/lib/api";
import { Project } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const uploadSchema = z.object({
  title: z.string().min(1, "Document title is required"),
  projectId: z.string().min(1, "Please select a project"),
});

type UploadForm = z.infer<typeof uploadSchema>;

interface UploadDocumentDialogProps {
  onSuccess: () => void;
}

export default function UploadDocumentDialog({
  onSuccess,
}: UploadDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema),
  });

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectsApi.list({ status: "ACTIVE" });
        setProjects(response.data);
      } catch {
        // silent
      }
    };
    if (open) fetchProjects();
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Only PDF files are allowed");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const onSubmit = async (data: UploadForm) => {
    if (!selectedFile) {
      toast.error("Please select a PDF file");
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      // Step 1 — get presigned upload URL
      const urlResponse = await documentsApi.getUploadUrl({
        filename: selectedFile.name,
        projectId: data.projectId,
        title: data.title,
      });

      const { uploadUrl, documentId, key } = urlResponse.data;

      // Step 2 — upload file directly to S3
      await axios.put(uploadUrl, selectedFile, {
        headers: { "Content-Type": "application/pdf" },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total ?? 1),
          );
          setUploadProgress(progress);
        },
      });

      // Step 3 — create document record
      await documentsApi.create({
        documentId,
        projectId: data.projectId,
        title: data.title,
        fileKey: key,
      });

      toast.success("Document uploaded successfully");
      reset();
      setSelectedFile(null);
      setUploadProgress(0);
      setOpen(false);
      onSuccess();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to upload document";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>
            Upload a PDF contract to send to your client for signing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Project *</Label>
            <Select onValueChange={(value) => setValue("projectId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                    {project.client ? ` — ${project.client.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.projectId && (
              <p className="text-sm text-red-500">{errors.projectId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Document title *</Label>
            <Input
              id="title"
              placeholder="NDA — Riya Bakery"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>PDF File *</Label>
            <div
              className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-slate-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2 text-slate-700">
                  <FileText className="w-5 h-5 text-slate-500" />
                  <span className="text-sm font-medium">
                    {selectedFile.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              ) : (
                <div className="text-slate-400">
                  <Upload className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Click to select a PDF file</p>
                  <p className="text-xs mt-1">Max 10MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {isLoading && uploadProgress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div
                  className="bg-slate-900 h-1.5 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !selectedFile}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
