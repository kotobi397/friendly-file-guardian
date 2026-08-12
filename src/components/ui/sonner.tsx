import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"
import { useEffect, useState } from "react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Use a safe theme getter that handles the case where ThemeProvider might not be ready
  let theme: string = "system"
  try {
    const themeContext = useTheme()
    theme = themeContext.theme || "system"
  } catch {
    // ThemeProvider not ready yet, use system default
    theme = "system"
  }

  if (!mounted) {
    return null
  }

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      dir="rtl"
      className="toaster group"
      richColors
      closeButton
      expand={false}
      visibleToasts={1}
      position="top-center"
      toastOptions={{
        duration: 4000,
        className: "z-[2000] !max-w-[85vw] sm:!max-w-[340px]",
        classNames: {
          toast:
            "group toast group-[.toaster]:z-[2000] group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-lg group-[.toaster]:p-3 group-[.toaster]:border group-[.toaster]:text-sm",
          title: 
            "group-[.toast]:font-semibold group-[.toast]:text-sm group-[.toast]:mb-0.5 group-[.toast]:text-card-foreground",
          description: 
            "group-[.toast]:text-muted-foreground group-[.toast]:text-xs",
          success:
            "!bg-emerald-50 dark:!bg-emerald-950 !border-emerald-300 dark:!border-emerald-700 !text-emerald-800 dark:!text-emerald-200",
          error:
            "!bg-red-50 dark:!bg-red-950 !border-red-300 dark:!border-red-700 !text-red-800 dark:!text-red-200",
          info:
            "!bg-blue-50 dark:!bg-blue-950 !border-blue-300 dark:!border-blue-700 !text-blue-800 dark:!text-blue-200",
          warning:
            "!bg-sky-50 dark:!bg-sky-950 !border-sky-300 dark:!border-sky-700 !text-sky-800 dark:!text-sky-200",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
export { toast } from "sonner"
