export type UserRole = "ADMIN" | "MEMBER";
export type WorkspacePlan = "FREE" | "PRO" | "AGENCY";
export type DocumentStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "SIGNED"
  | "EXPIRED"
  | "CANCELLED";
export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";
export type ProjectStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export interface User {
  id: string;
  email: string;
}

export interface Workspace {
  id: string;
  name: string;
  plan: WorkspacePlan;
  logoUrl?: string;
}

export interface Member {
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
  workspace: Workspace;
  member: Member;
}

export interface Client {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  clientId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  _count?: {
    documents: number;
    invoices: number;
  };
}

export interface DocumentField {
  id: string;
  documentId: string;
  type: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Document {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  fileUrl: string;
  signedFileUrl?: string;
  status: DocumentStatus;
  publicToken: string;
  signerEmail?: string;
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  documentFields?: DocumentField[];
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  workspaceId: string;
  projectId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes?: string;
  publicToken: string;
  paymentLink?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  project?: Project;
}
