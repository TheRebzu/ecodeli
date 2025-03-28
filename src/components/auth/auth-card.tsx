import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthCardProps {
  children: ReactNode;
  title?: string;
  description?: string;
  footer?: ReactNode;
  className?: string;
  cardHeaderClassName?: string;
  cardContentClassName?: string;
  cardFooterClassName?: string;
}

export function AuthCard({
  children,
  title,
  description,
  footer,
  className,
  cardHeaderClassName,
  cardContentClassName,
  cardFooterClassName,
}: AuthCardProps) {
  return (
    <Card className={cn("w-full max-w-md border shadow-sm", className)}>
      {(title || description) && (
        <CardHeader className={cn("space-y-1", cardHeaderClassName)}>
          {title && <CardTitle className="text-2xl font-bold">{title}</CardTitle>}
          {description && (
            <CardDescription className="text-sm text-muted-foreground">
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent className={cn("pt-4", cardContentClassName)}>
        {children}
      </CardContent>
      {footer && (
        <CardFooter className={cn("flex flex-col space-y-2 pt-0", cardFooterClassName)}>
          {footer}
        </CardFooter>
      )}
    </Card>
  );
} 