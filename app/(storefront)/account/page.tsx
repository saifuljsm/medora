import { User } from "lucide-react";

// Customer accounts need customer auth (OTP + Google/Facebook), which the
// build spec doesn't assign to a specific numbered phase — it's referenced
// in the tech stack and lib/ module list, but guest checkout (spec §8 rule
// 8) is the primary V1 ecommerce path. This is a placeholder until that
// lands.
export default function AccountPage() {
  return (
    <div className="flex flex-col items-center gap-3 px-0 pt-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-tint">
        <User className="h-6 w-6 text-primary" strokeWidth={2} />
      </div>
      <p className="text-sm font-semibold text-foreground">Sign in to view your account</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        Customer accounts (order history, saved addresses) are coming soon. You can still check out as a guest.
      </p>
    </div>
  );
}
