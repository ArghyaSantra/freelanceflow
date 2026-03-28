import type { User, Workspace, WorkspaceMember } from "@prisma/client";

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
    workspace?: Workspace;
    member?: WorkspaceMember;
  }
}
