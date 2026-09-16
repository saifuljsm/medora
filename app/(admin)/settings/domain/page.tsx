import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { DomainSettingsForm } from "@/components/admin/domain-settings-form";

export const dynamic = "force-dynamic";

export default async function DomainSettingsPage() {
  const session = await auth();
  assertCan(session!.user, "settings:manage");

  const org = await prisma.org.findUniqueOrThrow({ where: { id: session!.user.orgId } });

  return (
    <div className="mx-auto max-w-xl px-6 py-8">
      <h1 className="text-xl font-bold text-foreground">Custom domain</h1>
      <p className="mt-1 text-sm text-muted-foreground">Use your own domain for the storefront instead of the default address.</p>

      <div className="mt-5">
        <DomainSettingsForm
          currentDomain={org.customDomain}
          verifiedAt={org.domainVerifiedAt ? org.domainVerifiedAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" }) : null}
        />
      </div>
    </div>
  );
}
