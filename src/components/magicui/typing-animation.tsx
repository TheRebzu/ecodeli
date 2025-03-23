"use client";

import { cn } from "@/lib/utils";
import { motion, MotionProps } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface TypingAnimationProps extends MotionProps {
  children?: string;
  words?: string[];
  className?: string;
  duration?: number;
  delay?: number;
  as?: React.ElementType;
  startOnView?: boolean;
  wordDelay?: number;
}

export function TypingAnimation({
  children,
  words,
  className,
  duration = 100,
  delay = 0,
  wordDelay = 2000,
  as: Component = "div",
  startOnView = false,
  ...props
}: TypingAnimationProps) {
  const MotionComponent = motion(Component);

  const [displayedText, setDisplayedText] = useState<string>("");
  const [started, setStarted] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const elementRef = useRef<HTMLElement | null>(null);

  // Determine what text to type
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
        // Typing effect
        if (i < textToType.length) {
          setDisplayedText(textToType.substring(0, i + 1));
          i++;
          typingTimeout = setTimeout(typingEffect, duration);
        } else {
          // Wait before erasing
          isTyping = false;
          typingTimeout = setTimeout(typingEffect, wordDelay);
        }
      } else {
        // Erasing effect
        if (i > 0) {
          setDisplayedText(textToType.substring(0, i - 1));
          i--;
          typingTimeout = setTimeout(typingEffect, duration / 2);
        } else {
          // Move to next word when done erasing
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
  }, [started, textToType, duration, wordDelay, words]);

  return (
    <MotionComponent
      ref={elementRef}
      className={cn(
        "inline-block",
        className,
      )}
      {...props}
    >
      {displayedText}
    </MotionComponent>
  );
}
