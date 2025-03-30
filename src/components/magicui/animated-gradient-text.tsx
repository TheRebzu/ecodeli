"use client";

import { cn } from "@/lib/utils";
import { ComponentPropsWithoutRef, useEffect, useState } from "react";

export interface AnimatedGradientTextProps
  extends ComponentPropsWithoutRef<"div"> {
  speed?: number;
  colorFrom?: string;
  colorTo?: string;
  mobileAdjust?: boolean;
}

export function AnimatedGradientText({
  children,
  className,
  speed = 1,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  mobileAdjust = true,
  ...props
}: AnimatedGradientTextProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <span
      style={
        {
          "--bg-size": `${speed * 300}%`,
          "--color-from": colorFrom,
          "--color-to": colorTo,
          maxWidth: "100%",
          overflowWrap: mobileAdjust && isMobile ? "break-word" : "normal",
          display: "inline-block",
          wordBreak: mobileAdjust && isMobile ? "break-word" : "normal",
          hyphens: mobileAdjust && isMobile ? "auto" : "none",
        } as React.CSSProperties
      }
      className={cn(
        `inline animate-gradient bg-gradient-to-r from-[var(--color-from)] via-[var(--color-to)] to-[var(--color-from)] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent`,
        mobileAdjust && isMobile ? "text-balance" : "",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
