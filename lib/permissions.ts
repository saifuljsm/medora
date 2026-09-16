import { Role } from "@prisma/client";

/**
 * The one shared permission-check surface every server action calls.
 * Implements the role table from the build spec §7:
 *
 *   OWNER              unconditional — bypasses every check
 *   ADMIN              staff, branches, pricing, catalog, purchasing
 *                       (+ management oversight of ops: stock adjustments,
 *                       returns, reconciliation, reports, coupons, settings,
 *                       ecom order management)
 *   PHARMACIST         prescription approval, branch-scoped
 *   INVENTORY_MANAGER  purchasing, stock, StockAdjustment write-offs, branch-scoped
 *   CASHIER            POS at own branch; Quick Stock Entry; Returns (all,
 *                       no prescription split); daily cash reconciliation
 */

export type Capability =
  | "staff:manage"
  | "branch:manage"
  | "pricing:manage"
  | "catalog:manage"
  | "purchasing:manage"
  | "purchasing:receive"
  | "pos:sell"
  | "stock:quickEntry"
  | "stock:adjust"
  | "stock:transfer"
  | "prescription:review"
  | "returns:process"
  | "reconciliation:manage"
  | "reports:view"
  | "coupons:manage"
  | "settings:manage"
  | "orders:manage"
  | "orders:createStaffAssisted";

/** Roles whose capabilities are limited to their own branch. */
const BRANCH_SCOPED_ROLES: Role[] = [Role.PHARMACIST, Role.INVENTORY_MANAGER, Role.CASHIER];

const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  OWNER: [], // bypasses ROLE_CAPABILITIES entirely — see can()
  ADMIN: [
    "staff:manage",
    "branch:manage",
    "pricing:manage",
    "catalog:manage",
    "purchasing:manage",
    "purchasing:receive",
    "stock:adjust",
    "returns:process",
    "reconciliation:manage",
    "reports:view",
    "coupons:manage",
    "settings:manage",
    "orders:manage",
    "orders:createStaffAssisted",
  ],
  PHARMACIST: ["prescription:review"],
  INVENTORY_MANAGER: ["purchasing:manage", "purchasing:receive", "stock:adjust", "stock:transfer"],
  CASHIER: ["pos:sell", "stock:quickEntry", "returns:process", "reconciliation:manage"],
};

export interface PermissionUser {
  id: string;
  orgId: string;
  branchId: string | null;
  roles: Role[];
}

export class PermissionError extends Error {
  constructor(capability: Capability) {
    super(`Not permitted: ${capability}`);
    this.name = "PermissionError";
  }
}

/**
 * @param opts.branchId - the branch the action targets. Required for
 *   capabilities that a branch-scoped role is checked against; omit for
 *   org-wide actions (e.g. catalog:manage).
 */
export function can(user: PermissionUser, capability: Capability, opts?: { branchId?: string }): boolean {
  if (user.roles.includes(Role.OWNER)) return true;

  const grantingRoles = user.roles.filter((role) => ROLE_CAPABILITIES[role]?.includes(capability));
  if (grantingRoles.length === 0) return false;

  // If every granting role is branch-scoped, the action must target the
  // user's own branch. ADMIN (org-wide) granting the same capability means
  // the check passes regardless of branch.
  const allGrantingRolesBranchScoped = grantingRoles.every((role) => BRANCH_SCOPED_ROLES.includes(role));
  if (allGrantingRolesBranchScoped && opts?.branchId) {
    return user.branchId !== null && user.branchId === opts.branchId;
  }

  return true;
}

export function assertCan(user: PermissionUser, capability: Capability, opts?: { branchId?: string }): void {
  if (!can(user, capability, opts)) {
    throw new PermissionError(capability);
  }
}
