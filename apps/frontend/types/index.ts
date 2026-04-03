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
export type AssetStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AssetType = "IMAGE" | "VIDEO";
export type AuthorType = "FREELANCER" | "CLIENT";

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
  signerIp?: string;
  sentAt?: string; // ← add this
  sentBy?: string; // ← add this
  signedAt?: string;
  expiresAt?: string; // ← add this
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
  razorpayOrderId?: string; // ← add
  razorpayPaymentId?: string; // ← add
  sentBy?: string; // ← add
  sentAt?: string; // ← add
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  project?: Project;
}

export interface AssetComment {
  id: string;
  assetId: string;
  authorId: string;
  authorType: AuthorType;
  content: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  workspaceId: string;
  projectId: string;
  clientId: string;
  title: string;
  description?: string;
  fileUrl: string;
  type: AssetType;
  status: AssetStatus;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
  client?: { id: string; name: string };
  comments?: AssetComment[];
  viewUrl?: string;
}
