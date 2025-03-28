'use client';

type RoleCount = {
  role: string;
  _count: {
    id: number;
  }
};

type UsersDistributionProps = {
  usersByRole: RoleCount[];
};

export function UsersDistribution({ usersByRole }: UsersDistributionProps) {
  const getRoleName = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Administrateurs";
      case "MERCHANT":
        return "Commerçants";
      case "CUSTOMER":
        return "Clients";
      case "DELIVERY_PERSON":
        return "Livreurs";
      case "SERVICE_PROVIDER":
        return "Fournisseurs";
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "#ef4444"; // red
      case "MERCHANT":
        return "#f59e0b"; // amber
      case "CUSTOMER":
        return "#3b82f6"; // blue
      case "DELIVERY_PERSON":
        return "#10b981"; // green
      case "SERVICE_PROVIDER":
        return "#8b5cf6"; // purple
      default:
        return "#8b5cf6"; // purple
    }
  };

  return (
    <div className="space-y-4">
      {usersByRole.map((role) => (
        <div key={role.role} className="flex items-center">
          <div className="w-1/3 font-medium">
            {getRoleName(role.role)}
          </div>
          <div className="w-2/3">
            <div className="flex items-center">
              <div
                className="h-2 rounded"
                style={{
                  width: `${Math.min(
                    (role._count.id / Math.max(...usersByRole.map((r) => r._count.id))) * 100,
                    100
                  )}%`,
                  backgroundColor: getRoleColor(role.role),
                }}
              ></div>
              <span className="ml-2 text-sm">{role._count.id}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 