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
    default: "text-primary border-primary/20 bg-primary/5",
    warning: "text-gold border-gold/20 bg-gold/5",
    success: "text-green-400 border-green-400/20 bg-green-400/5",
    danger: "text-red-500 border-red-500/20 bg-red-500/5",
  };

  const glowStyles = {
    default: "shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)]",
    warning: "shadow-[0_0_20px_-5px_rgba(255,204,0,0.3)]",
    success: "shadow-[0_0_20px_-5px_rgba(74,222,128,0.3)]",
    danger: "shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)]",
  };

  return (
    <div className={cn(
      "glass-card rounded-2xl p-6 transition-all duration-500 hover:scale-[1.02] cursor-default border group",
      variantStyles[variant],
      "hover:border-opacity-40 hover:" + glowStyles[variant]
    )}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">
          {title}
        </span>
        <div className={cn(
          "p-2.5 rounded-xl border transition-all duration-500 group-hover:scale-110",
          variantStyles[variant]
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div className="text-3xl font-black font-display tracking-tight text-white group-hover:text-primary transition-colors duration-500">
          {value}
        </div>

        {trend && (
          <div className={cn(
            "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border",
            trend.isPositive
              ? "bg-green-500/10 text-green-500 border-green-500/20"
              : "bg-red-500/10 text-red-500 border-red-500/20"
          )}>
            {trend.isPositive ? "↑" : "↓"} {trend.value}%
          </div>
        )}
      </div>

      {/* Subtle indicator bar at the bottom */}
      <div className={cn(
        "absolute bottom-0 left-6 right-6 h-[2px] rounded-full transition-all duration-500 opacity-0 group-hover:opacity-100",
        variant === 'default' ? "bg-primary" :
          variant === 'warning' ? "bg-gold" :
            variant === 'success' ? "bg-green-400" : "bg-red-500"
      )} />
    </div>
  );
};

export default StatsCard;
