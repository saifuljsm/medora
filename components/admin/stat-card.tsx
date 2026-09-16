import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  href,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "primary" | "mint" | "success" | "warning" | "destructive";
  href?: string;
}) {
  const toneClasses: Record<string, string> = {
    primary: "bg-primary-tint text-primary",
    mint: "bg-mint-tint text-mint-dark",
    success: "bg-success-tint text-success",
    warning: "bg-warning-tint text-warning",
    destructive: "bg-destructive-tint text-destructive",
  };

  const content = (
    <div className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-[20px] font-bold leading-tight text-foreground">{value}</p>
        <p className="truncate text-[12.5px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }
  return content;
}
