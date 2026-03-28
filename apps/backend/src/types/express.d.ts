import type { User, Workspace, WorkspaceMember } from "@prisma/client/edge";

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
    workspace?: Workspace;
    member?: WorkspaceMember;
  }
}
