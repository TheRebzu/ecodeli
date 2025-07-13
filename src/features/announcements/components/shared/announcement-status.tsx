"use client";

interface AnnouncementStatusProps {
  status: string;
  size?: "sm" | "md" | "lg";
}

export function AnnouncementStatus({
  status,
  size = "sm",
}: AnnouncementStatusProps) {
  const getStatusConfig = (status: string) => {
    const configs = {
      ACTIVE: {
        label: "Active",
        icon: "🟢",
        color: "bg-green-100 text-green-800 border-green-200",
      },
      MATCHED: {
        label: "Matchée",
        icon: "🔗",
        color: "bg-blue-100 text-blue-800 border-blue-200",
      },
      IN_PROGRESS: {
        label: "En cours",
        icon: "🚚",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      },
      COMPLETED: {
        label: "Terminée",
        icon: "✅",
        color: "bg-green-100 text-green-800 border-green-200",
      },
      CANCELLED: {
        label: "Annulée",
        icon: "❌",
        color: "bg-red-100 text-red-800 border-red-200",
      },
      PAUSED: {
        label: "En pause",
        icon: "⏸️",
        color: "bg-gray-100 text-gray-800 border-gray-200",
      },
      EXPIRED: {
        label: "Expirée",
        icon: "⏰",
        color: "bg-orange-100 text-orange-800 border-orange-200",
      },
      FLAGGED: {
        label: "Signalée",
        icon: "🚩",
        color: "bg-red-100 text-red-800 border-red-200",
      },
      SUSPENDED: {
        label: "Suspendue",
        icon: "🚫",
        color: "bg-red-100 text-red-800 border-red-200",
      },
    };
    return (
      configs[status as keyof typeof configs] || {
        label: status,
        icon: "⚪",
        color: "bg-gray-100 text-gray-800 border-gray-200",
      }
    );
  };

  const getSizeClasses = (size: string) => {
    const sizeClasses = {
      sm: "px-2 py-1 text-xs",
      md: "px-3 py-1.5 text-sm",
      lg: "px-4 py-2 text-base",
    };
    return sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.sm;
  };

  const config = getStatusConfig(status);
  const sizeClass = getSizeClasses(size);

  return (
    <span
      className={`inline-flex items-center space-x-1 font-medium rounded-full border ${config.color} ${sizeClass}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
