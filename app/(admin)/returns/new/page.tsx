import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { ReturnForm } from "@/components/admin/return-form";

export default async function NewReturnPage() {
  const session = await auth();
  if (!session?.user) return null;
  assertCan(session.user, "returns:process");

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-xl font-bold text-foreground">New return</h1>
      <ReturnForm />
    </div>
  );
}
