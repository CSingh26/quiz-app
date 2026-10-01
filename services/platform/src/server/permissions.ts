import { AppError } from "./errors";

export type Permission =
  | "quiz:create"
  | "material:upload"
  | "course:create"
  | "assignment:create"
  | "grade:review";
const study: readonly Permission[] = ["quiz:create", "material:upload"];
const rolePermissions: Readonly<Record<string, readonly Permission[]>> = {
  STUDENT: study,
  INSTRUCTOR: [...study, "course:create", "assignment:create", "grade:review"],
  ADMIN: [...study, "course:create", "assignment:create", "grade:review"],
};

export function hasPermission(role: string, permission: Permission) {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function requirePermission(role: string, permission: Permission) {
  if (!hasPermission(role, permission))
    throw new AppError(
      "FORBIDDEN",
      "Your account does not have permission for this action.",
      403,
    );
}
