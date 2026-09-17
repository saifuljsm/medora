import { FileText } from "lucide-react";
import { auth } from "@/lib/auth";
import { PrescriptionOrderForm } from "@/components/storefront/prescription-order-form";
import { CustomerSignInForm } from "@/components/storefront/customer-sign-in-form";

export const dynamic = "force-dynamic";

export default async function PrescriptionOrderPage() {
  const session = await auth();
  const isCustomer = session?.user?.type === "customer";

  return (
    <div className="pt-4 lg:mx-auto lg:max-w-lg lg:px-0 lg:pt-6">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-tint">
          <FileText className="h-5 w-5 text-primary" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground">Upload your prescription</h1>
          <p className="text-xs text-muted-foreground">A licensed pharmacist reviews every prescription before it&apos;s approved.</p>
        </div>
      </div>

      {isCustomer ? (
        <PrescriptionOrderForm initialName={session!.user.name} />
      ) : (
        <>
          <div className="mb-4 rounded-lg border border-warning bg-warning-tint px-3 py-2.5 text-xs font-semibold text-warning">
            Sign in with your phone first — this confirms the prescription is really yours before a pharmacist reviews it.
          </div>
          <CustomerSignInForm redirectTo="/prescription-order" />
        </>
      )}
    </div>
  );
}
