export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      Chargement...
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function ButtonWithLoading({
  children,
  isLoading,
  ...props
}: {
  children: React.ReactNode;
  isLoading?: boolean;
} & React.ComponentProps<typeof Button>) {
  return (
    <Button disabled={isLoading} {...props}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}
