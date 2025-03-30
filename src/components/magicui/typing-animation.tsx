"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface TypingAnimationProps extends React.ComponentPropsWithoutRef<"span"> {
  children?: string;
  words?: string[];
  className?: string;
  duration?: number;
  delay?: number;
  as?: React.ElementType;
  startOnView?: boolean;
  wordDelay?: number;
  mobileAdjust?: boolean;
}

export function TypingAnimation({
  children,
  words,
  className,
  duration = 100,
  delay = 0,
  wordDelay = 2000,
  as: Component = "span",
  startOnView = false,
  mobileAdjust = true,
  ...props
}: TypingAnimationProps) {
  const MotionComponent = motion.create(Component);

  const [displayedText, setDisplayedText] = useState<string>("");
  const [started, setStarted] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const adjustedDuration = isMobile && mobileAdjust ? duration * 1.5 : duration;
  const adjustedWordDelay = isMobile && mobileAdjust ? wordDelay * 0.8 : wordDelay;

  const textToType = words ? words[currentWordIndex] : children || "";

  useEffect(() => {
    if (!startOnView) {
      const startTimeout = setTimeout(() => {
        setStarted(true);
      }, delay);
      return () => clearTimeout(startTimeout);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setStarted(true);
          }, delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [delay, startOnView]);

  useEffect(() => {
    if (!started) return;
    
    let i = 0;
    let isTyping = true;
    let typingTimeout: NodeJS.Timeout | null = null;
    
    const typingEffect = () => {
      if (isTyping) {
        if (i < textToType.length) {
          setDisplayedText(textToType.substring(0, i + 1));
          i++;
          typingTimeout = setTimeout(typingEffect, adjustedDuration);
        } else {
          isTyping = false;
          typingTimeout = setTimeout(typingEffect, adjustedWordDelay);
        }
      } else {
        if (i > 0) {
          setDisplayedText(textToType.substring(0, i - 1));
          i--;
          typingTimeout = setTimeout(typingEffect, adjustedDuration / 2);
        } else {
          isTyping = true;
          if (words) {
            setCurrentWordIndex((prevIndex) => (prevIndex + 1) % words.length);
          }
          typingTimeout = setTimeout(typingEffect, 500);
        }
      }
    };
    
    typingTimeout = setTimeout(typingEffect, 0);
    
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [started, textToType, adjustedDuration, adjustedWordDelay, words]);

  return (
    <MotionComponent
      ref={elementRef}
      className={cn(
        "inline-block",
        isMobile && mobileAdjust ? "text-balance max-w-full" : "",
        className,
      )}
      style={{
        maxWidth: "100%",
        display: "inline-block",
        ...(isMobile && mobileAdjust ? { 
          wordBreak: "break-word",
          overflow: "hidden",
          hyphens: "auto"
        } : {})
      }}
      {...props}
    >
      {displayedText}
    </MotionComponent>
  );
}
