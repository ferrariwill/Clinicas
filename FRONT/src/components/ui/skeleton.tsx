import React from "react"
import { cn } from "@/lib/utils/cn"

const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]",
        className
      )}
      {...props}
    />
  )
)
Skeleton.displayName = "Skeleton"

/**
 * Skeleton para cards de métricas
 */
export const MetricCardSkeleton = () => (
  <div className="space-y-4 p-6">
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-10 w-24" />
    <div className="flex items-center gap-2 pt-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-20" />
    </div>
  </div>
)

/**
 * Skeleton para lista de itens
 */
export const ListItemSkeleton = () => (
  <div className="space-y-3 p-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    ))}
  </div>
)

/**
 * Skeleton para tabelas
 */
export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-2">
    {/* Header */}
    <div className="flex gap-4 p-4 border-b">
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 flex-1" />
    </div>

    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 p-4">
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 flex-1" />
      </div>
    ))}
  </div>
)

/**
 * Skeleton para gráfico
 */
export const ChartSkeleton = () => (
  <div className="space-y-4 p-6">
    <Skeleton className="h-4 w-40" />
    <div className="flex gap-2 h-64">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col-reverse items-center gap-2">
          <Skeleton className={`w-full rounded-t`} style={{ height: `${Math.random() * 100 + 50}%` }} />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  </div>
)

export { Skeleton }
