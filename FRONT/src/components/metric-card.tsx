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

const variantStyles = {
  default: "bg-blue-50 border-blue-200 text-blue-700",
  success: "bg-green-50 border-green-200 text-green-700",
  warning: "bg-amber-50 border-amber-200 text-amber-700",
  danger: "bg-red-50 border-red-200 text-red-700",
  info: "bg-cyan-50 border-cyan-200 text-cyan-700",
}

const iconBgStyles = {
  default: "bg-blue-100 text-blue-600",
  success: "bg-green-100 text-green-600",
  warning: "bg-amber-100 text-amber-600",
  danger: "bg-red-100 text-red-600",
  info: "bg-cyan-100 text-cyan-600",
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
