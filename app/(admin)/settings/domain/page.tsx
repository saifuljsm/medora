import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { DomainSettingsForm } from "@/components/admin/domain-settings-form";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";

export default async function DomainSettingsPage() {
  const session = await auth();
  assertCan(session!.user, "settings:manage");

  const org = await prisma.org.findUniqueOrThrow({ where: { id: session!.user.orgId } });

  return (
    <div className="mx-auto max-w-xl px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader title="Custom domain" description="Use your own domain for the storefront instead of the default address." />

      <div>
        <DomainSettingsForm
          currentDomain={org.customDomain}
          verifiedAt={org.domainVerifiedAt ? org.domainVerifiedAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" }) : null}
        />
      </div>
    </div>
  );
}
