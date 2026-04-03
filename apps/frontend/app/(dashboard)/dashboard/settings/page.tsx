"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Building2, CreditCard, FileText } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const settingsSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
  address: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfsc: z.string().optional(),
  invoicePrefix: z.string().min(1, "Invoice prefix is required"),
  invoiceFooter: z.string().optional(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { workspace, setAuth, user, member } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      invoicePrefix: "INV",
    },
  });

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const response = await api.get("/auth/me");
        const { workspace: ws } = response.data;
        reset({
          name: ws.name ?? "",
          address: ws.address ?? "",
          gstin: ws.gstin ?? "",
          pan: ws.pan ?? "",
          bankName: ws.bankName ?? "",
          bankAccountNumber: ws.bankAccountNumber ?? "",
          bankIfsc: ws.bankIfsc ?? "",
          invoicePrefix: ws.invoicePrefix ?? "INV",
          invoiceFooter: ws.invoiceFooter ?? "",
        });
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setIsFetching(false);
      }
    };

    fetchWorkspace();
  }, [reset]);

  const onSubmit = async (data: SettingsForm) => {
    setIsLoading(true);
    try {
      const response = await api.put("/workspace", data);
      toast.success("Settings saved successfully");

      // update auth store with new workspace name
      if (user && member) {
        setAuth(user, response.data, member, useAuth.getState().accessToken!);
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to save settings";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">
          Manage your workspace profile and invoice settings
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Business Profile */}
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500" />
              <CardTitle className="text-base">Business Profile</CardTitle>
            </div>
            <CardDescription>
              This information appears on your invoices and documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business name *</Label>
              <Input
                id="name"
                placeholder="Arjun Studio"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Business address</Label>
              <Input
                id="address"
                placeholder="123 Main St, Mumbai, Maharashtra 400001"
                {...register("address")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  placeholder="22AAAAA0000A1Z5"
                  {...register("gstin")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan">PAN</Label>
                <Input id="pan" placeholder="AAAAA0000A" {...register("pan")} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-500" />
              <CardTitle className="text-base">Bank Details</CardTitle>
            </div>
            <CardDescription>
              Used for manual bank transfers on invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank name</Label>
              <Input
                id="bankName"
                placeholder="HDFC Bank"
                {...register("bankName")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber">Account number</Label>
                <Input
                  id="bankAccountNumber"
                  placeholder="1234567890"
                  {...register("bankAccountNumber")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankIfsc">IFSC code</Label>
                <Input
                  id="bankIfsc"
                  placeholder="HDFC0001234"
                  {...register("bankIfsc")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Settings */}
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <CardTitle className="text-base">Invoice Settings</CardTitle>
            </div>
            <CardDescription>
              Customize how your invoices look and are numbered
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoicePrefix">Invoice prefix *</Label>
              <Input
                id="invoicePrefix"
                placeholder="INV"
                {...register("invoicePrefix")}
              />
              <p className="text-xs text-slate-500">
                Invoices will be numbered as{" "}
                {workspace?.name ? `${register("invoicePrefix").name}` : "INV"}
                -2024-001
              </p>
              {errors.invoicePrefix && (
                <p className="text-sm text-red-500">
                  {errors.invoicePrefix.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceFooter">Invoice footer</Label>
              <Input
                id="invoiceFooter"
                placeholder="Thank you for your business!"
                {...register("invoiceFooter")}
              />
              <p className="text-xs text-slate-500">
                Appears at the bottom of every invoice
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save settings
          </Button>
        </div>
      </form>
    </div>
  );
}
