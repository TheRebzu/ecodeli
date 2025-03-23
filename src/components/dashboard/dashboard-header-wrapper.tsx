import DashboardHeader from "./dashboard-header"

type DashboardVariant = "client" | "courier" | "merchant" | "provider" | "admin"

// Type pour les propriétés du composant
interface DashboardHeaderWrapperProps {
  user: {
    name?: string
    email?: string
    role?: string
    image?: string
  }
  variant: DashboardVariant
}

export default function DashboardHeaderWrapper({ user, variant }: DashboardHeaderWrapperProps) {
  return (
    <DashboardHeader 
      user={user}
      variant={variant}
    />
  )
} 