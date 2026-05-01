"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { UiThemeProvider } from "@/context/ui-theme-context"

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <UiThemeProvider>
        {children}
        <Toaster position="top-right" richColors closeButton theme="light" />
      </UiThemeProvider>
    </QueryClientProvider>
  )
}
