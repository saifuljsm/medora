import { FileText } from "lucide-react";
import { PrescriptionOrderForm } from "@/components/storefront/prescription-order-form";

export default function PrescriptionOrderPage() {
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

      <PrescriptionOrderForm />
    </div>
  );
}
