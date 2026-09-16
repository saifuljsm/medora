import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { ReturnForm } from "@/components/admin/return-form";
import { PageHeader } from "@/components/admin/page-header";

export default async function NewReturnPage() {
  const session = await auth();
  if (!session?.user) return null;
  assertCan(session.user, "returns:process");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader title="New return" />
      <ReturnForm />
    </div>
  );
}
