import { SetMetadata } from "@nestjs/common"

export type Role = "admin" | "superadmin"

export const ROLES_KEY = "roles"
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)

// Convenience decorators
export const Admin = () => Roles("admin")
export const SuperAdmin = () => Roles("superadmin")
