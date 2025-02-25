import type React from "react"

interface PageHeaderProps {
  heading: string
  text?: string
  children?: React.ReactNode
}

export function PageHeader({ heading, text, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        {text && <p className="text-neutral-500">{text}</p>}
      </div>
      {children}
    </div>
  )
}

