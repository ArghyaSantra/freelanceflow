"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { invoicesApi, projectsApi } from "@/lib/api";
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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0, "Price must be positive"),
  amount: z.coerce.number(),
});

const invoiceSchema = z.object({
  projectId: z.string().min(1, "Please select a project"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  currency: z.string().default("INR"),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "Add at least one line item"),
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

interface CreateInvoiceDialogProps {
  onSuccess: () => void;
}

export default function CreateInvoiceDialog({
  onSuccess,
}: CreateInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      currency: "INR",
      taxRate: 18,
      lineItems: [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems",
  });

  const lineItems = watch("lineItems");
  const taxRate = watch("taxRate") ?? 0;

  const subtotal =
    lineItems?.reduce((sum, item) => {
      return sum + (item.quantity ?? 0) * (item.unitPrice ?? 0);
    }, 0) ?? 0;

  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  // auto calculate amount when qty or price changes
  useEffect(() => {
    lineItems?.forEach((item, index) => {
      const amount = (item.quantity ?? 0) * (item.unitPrice ?? 0);
      setValue(`lineItems.${index}.amount`, amount);
    });
  }, [
    JSON.stringify(lineItems?.map((i) => ({ q: i.quantity, p: i.unitPrice }))),
  ]);

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

  const onSubmit = async (data: InvoiceForm) => {
    setIsLoading(true);
    try {
      await invoicesApi.create({
        ...data,
        lineItems: data.lineItems.map((item) => ({
          ...item,
          amount: item.quantity * item.unitPrice,
        })),
      });
      toast.success("Invoice created successfully");
      reset();
      setOpen(false);
      onSuccess();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to create invoice";
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
          New Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice to send to your client.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Project */}
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

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue date *</Label>
              <Input id="issueDate" type="date" {...register("issueDate")} />
              {errors.issueDate && (
                <p className="text-sm text-red-500">
                  {errors.issueDate.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due date *</Label>
              <Input id="dueDate" type="date" {...register("dueDate")} />
              {errors.dueDate && (
                <p className="text-sm text-red-500">{errors.dueDate.message}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Line items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Line items *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    description: "",
                    quantity: 1,
                    unitPrice: 0,
                    amount: 0,
                  })
                }
              >
                <Plus className="w-3 h-3 mr-1" />
                Add item
              </Button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 px-1">
                <span className="col-span-5">Description</span>
                <span className="col-span-2">Qty</span>
                <span className="col-span-3">Rate (₹)</span>
                <span className="col-span-1">Amount</span>
                <span className="col-span-1" />
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-5">
                    <Input
                      placeholder="Website design"
                      {...register(`lineItems.${index}.description`)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="1"
                      {...register(`lineItems.${index}.quantity`)}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min="0"
                      {...register(`lineItems.${index}.unitPrice`)}
                    />
                  </div>
                  <div className="col-span-1 text-sm text-slate-600 font-medium">
                    ₹
                    {(
                      (lineItems?.[index]?.quantity ?? 0) *
                      (lineItems?.[index]?.unitPrice ?? 0)
                    ).toLocaleString("en-IN")}
                  </div>
                  <div className="col-span-1">
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-2">
                <span>GST (%)</span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  className="w-16 h-7 text-xs"
                  {...register("taxRate")}
                />
              </div>
              <span>₹{taxAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-900 text-base">
              <span>Total</span>
              <span>₹{total.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Payment terms, bank details etc."
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
