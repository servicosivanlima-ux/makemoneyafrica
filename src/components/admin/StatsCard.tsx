import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "warning" | "success" | "danger";
}

const StatsCard = ({ title, value, icon: Icon, trend, variant = "default" }: StatsCardProps) => {
  const variantStyles = {
    default: "text-primary",
    warning: "text-gold",
    success: "text-green-500",
    danger: "text-red-500",
  };

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{title}</span>
        <Icon className={cn("w-5 h-5", variantStyles[variant])} />
      </div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {trend && (
          <div className={cn(
            "text-xs font-medium px-2 py-1 rounded",
            trend.isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
          )}>
            {trend.isPositive ? "+" : ""}{trend.value}%
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
