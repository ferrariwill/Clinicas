import React from "react"
import { LucideIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils/cn"

interface MetricCardProps {
  title: string
  description?: string
  value: string | number
  icon: LucideIcon
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  variant?: "default" | "success" | "warning" | "danger" | "info"
  isLoading?: boolean
}

/** Cartões neutros; só a borda esquerda espessa traz o destaque (menos cor no fundo). */
const variantStyles = {
  default: "bg-white text-slate-800 border-l-slate-400",
  success: "bg-white text-slate-800 border-l-emerald-500",
  warning: "bg-white text-slate-800 border-l-amber-500",
  danger: "bg-white text-slate-800 border-l-red-500",
  info: "bg-white text-slate-800 border-l-sky-500",
}

const iconBgStyles = {
  default: "bg-slate-100 text-slate-600",
  success: "bg-slate-100 text-emerald-600",
  warning: "bg-slate-100 text-amber-600",
  danger: "bg-slate-100 text-red-600",
  info: "bg-slate-100 text-sky-600",
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  description,
  value,
  icon: Icon,
  trend,
  trendValue,
  variant = "default",
  isLoading = false,
}) => {
  return (
    <Card className={cn("overflow-hidden border-l-4", variantStyles[variant])}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description && (
              <CardDescription className="text-xs mt-1">{description}</CardDescription>
            )}
          </div>
          <div className={cn("p-3 rounded-lg", iconBgStyles[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <div className="text-3xl font-bold">
            {isLoading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-32" />
            ) : (
              value
            )}
          </div>

          {trend && trendValue && (
            <div className="flex items-center gap-1 text-sm">
              {trend === "up" && <span className="text-green-600">↑</span>}
              {trend === "down" && <span className="text-red-600">↓</span>}
              {trend === "neutral" && <span className="text-gray-600">→</span>}
              <span className={cn(
                {
                  "text-green-600": trend === "up",
                  "text-red-600": trend === "down",
                  "text-gray-600": trend === "neutral",
                }
              )}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default MetricCard
