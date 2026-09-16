"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePassword } from "@/app/change-password/actions";

const FormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

type FormValues = z.infer<typeof FormSchema>;

export function ChangePasswordForm({ forced, redirectTo }: { forced: boolean; redirectTo: string }) {
  const router = useRouter();
  const { update } = useSession();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setIsSubmitting(true);
    const result = await changePassword(values);
    setIsSubmitting(false);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    await update({ mustChangePassword: false });
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {forced && (
        <div className="rounded-md border border-warning bg-warning-tint px-4 py-3 text-sm text-warning">
          You must set a new password before continuing.
        </div>
      )}
      {serverError && (
        <div className="rounded-md border border-destructive bg-destructive-tint px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="currentPassword" className="text-sm font-medium text-foreground">
          Current password
        </label>
        <Input id="currentPassword" type="password" autoComplete="current-password" {...register("currentPassword")} />
        {errors.currentPassword && <p className="text-xs text-destructive">{errors.currentPassword.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="text-sm font-medium text-foreground">
          New password
        </label>
        <Input id="newPassword" type="password" autoComplete="new-password" {...register("newPassword")} />
        {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmNewPassword" className="text-sm font-medium text-foreground">
          Confirm new password
        </label>
        <Input id="confirmNewPassword" type="password" autoComplete="new-password" {...register("confirmNewPassword")} />
        {errors.confirmNewPassword && (
          <p className="text-xs text-destructive">{errors.confirmNewPassword.message}</p>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
