import { can, type PermissionUser, type Capability } from "@/lib/permissions";

// String keys, not component references — this config is computed in a
// Server Component and passed as a prop to the (client) sidebar nav, and
// function/component references can't cross that boundary. The client
// component maps these keys to actual lucide-react icons.
export type AdminNavIconName =
  | "dashboard"
  | "pos"
  | "orders"
  | "returns"
  | "products"
  | "purchaseOrders"
  | "suppliers"
  | "quickEntry"
  | "adjustments"
  | "expiry"
  | "prescriptions"
  | "couriers"
  | "reconciliation"
  | "coupons"
  | "reports"
  | "settings";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: AdminNavIconName;
  capability: Capability;
}

export interface AdminNavSection {
  label: string;
  items: AdminNavItem[];
}

const NAV_SECTIONS: AdminNavSection[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "dashboard", capability: "pos:sell" }],
  },
  {
    label: "Sales",
    items: [
      { href: "/pos", label: "Point of sale", icon: "pos", capability: "pos:sell" },
      { href: "/orders", label: "Online orders", icon: "orders", capability: "orders:manage" },
      { href: "/returns", label: "Returns", icon: "returns", capability: "returns:process" },
    ],
  },
  {
    label: "Catalog",
    items: [{ href: "/products", label: "Products", icon: "products", capability: "catalog:manage" }],
  },
  {
    label: "Purchasing",
    items: [
      { href: "/purchasing/orders", label: "Purchase orders", icon: "purchaseOrders", capability: "purchasing:manage" },
      { href: "/purchasing/suppliers", label: "Suppliers", icon: "suppliers", capability: "purchasing:manage" },
      { href: "/purchasing/quick-entry", label: "Quick stock entry", icon: "quickEntry", capability: "stock:quickEntry" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { href: "/inventory/adjustments", label: "Adjustments", icon: "adjustments", capability: "stock:adjust" },
      { href: "/inventory/expiry-alerts", label: "Expiry alerts", icon: "expiry", capability: "stock:adjust" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/prescriptions", label: "Prescription review", icon: "prescriptions", capability: "prescription:review" },
      { href: "/couriers", label: "Couriers", icon: "couriers", capability: "orders:manage" },
      { href: "/reconciliation", label: "Cash reconciliation", icon: "reconciliation", capability: "reconciliation:manage" },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/coupons", label: "Coupons", icon: "coupons", capability: "coupons:manage" },
      { href: "/reports/sales", label: "Sales report", icon: "reports", capability: "reports:view" },
    ],
  },
  {
    label: "Settings",
    items: [{ href: "/settings/domain", label: "Custom domain", icon: "settings", capability: "settings:manage" }],
  },
];

/** Dashboard is a landing page every staff role reaches, so it's granted regardless of capability. */
export function getVisibleNavSections(user: PermissionUser): AdminNavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.href === "/dashboard" || can(user, item.capability)),
  })).filter((section) => section.items.length > 0);
}
