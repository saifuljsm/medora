"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupplier } from "@/app/(admin)/purchasing/suppliers/actions";

const FormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

export function SupplierForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema) });

  async function onSubmit(values: FormValues) {
    setError(null);
    setIsSubmitting(true);
    const result = await createSupplier(values);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">New supplier</h2>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-xs font-medium text-muted-foreground">
          Name
        </label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-xs font-medium text-muted-foreground">
          Phone
        </label>
        <Input id="phone" {...register("phone")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="address" className="text-xs font-medium text-muted-foreground">
          Address
        </label>
        <Input id="address" {...register("address")} />
      </div>
      <Button type="submit" disabled={isSubmitting} className="mt-1">
        {isSubmitting ? "Saving…" : "Add supplier"}
      </Button>
    </form>
  );
}
