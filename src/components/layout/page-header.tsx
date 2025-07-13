import { cn } from "@/lib/utils";

interface PageHeaderProps {
  className?: string;
  children?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({
  className,
  children,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "mx-auto flex max-w-[980px] flex-col items-start gap-2 px-4 pt-8 md:pt-12",
        className,
      )}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex-1">
          {title && (
            <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-4xl lg:leading-[1.1]">
              {title}
            </h1>
          )}
          {description && (
            <p className="max-w-[750px] text-lg font-light text-foreground/60">
              {description}
            </p>
          )}
        </div>
        {action && <div className="ml-4">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function PageHeaderHeading({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "text-3xl font-bold leading-tight tracking-tighter md:text-4xl lg:leading-[1.1]",
        className,
      )}
      {...props}
    />
  );
}

export function PageHeaderDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "max-w-[750px] text-lg font-light text-foreground/60",
        className,
      )}
      {...props}
    />
  );
}
