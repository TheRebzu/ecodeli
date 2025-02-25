import type React from "react"

interface Props {
  children: React.ReactNode
}

export default function CustomerLayout({ children }: Props) {
  return (
    <div className="customer-specific-wrapper">
      {/* Ajoutez ici des éléments spécifiques au layout customer si nécessaire */}
      {children}
    </div>
  )
}

