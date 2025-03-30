"use client";

import type { CSSProperties } from "react";
import React, { useEffect, useId, useRef, useState } from "react";
import { debounce } from "@/lib/utils";

interface AuroraTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  speed?: number; // 1 is default speed, 2 is twice as fast, 0.5 is half speed
  mobileAdjust?: boolean; // Active l'ajustement automatique sur mobile
}

export function AuroraText({
  children,
  className = "",
  colors = ["#FF0080", "#7928CA", "#0070F3", "#38bdf8", "#a855f7", "#2dd4bf"],
  speed = 1,
  mobileAdjust = true,
}: AuroraTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isReady, setIsReady] = useState(false);
  const [textStyle, setTextStyle] = useState<
    Partial<CSSStyleDeclaration>
  >({});
  const [isMobile, setIsMobile] = useState(false);
  const [resizeObserver, setResizeObserver] = useState<ResizeObserver | null>(null);
  const maskId = useId();

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Updated effect to compute all text styles from parent
  useEffect(() => {
    if (containerRef.current) {
      const computedStyle = window.getComputedStyle(containerRef.current);

      // Extract text-related styles
      const relevantStyles = {
        fontSize: computedStyle.fontSize,
        fontFamily: computedStyle.fontFamily,
        fontWeight: computedStyle.fontWeight,
        fontStyle: computedStyle.fontStyle,
        letterSpacing: computedStyle.letterSpacing,
        lineHeight: computedStyle.lineHeight,
        textTransform: computedStyle.textTransform,
        fontVariant: computedStyle.fontVariant,
        fontStretch: computedStyle.fontStretch,
        fontFeatureSettings: computedStyle.fontFeatureSettings,
      };

      requestAnimationFrame(() => {
        setTextStyle(relevantStyles);
      });
    }
  }, [className]);

  // Mise à jour des dimensions quand la fenêtre ou le conteneur change
  useEffect(() => {
    const updateDimensions = debounce(() => {
      if (textRef.current && containerRef.current) {
        try {
          const bbox = textRef.current.getBBox();
          
          // Ajuster les dimensions pour s'assurer qu'elles ne dépassent pas l'écran sur mobile
          let width = bbox.width;
          let height = bbox.height;
          
          // Vérifier si les dimensions sont correctes (éviter les dimensions nulles)
          if (width <= 0 || height <= 0) {
            const containerWidth = containerRef.current.offsetWidth;
            width = containerWidth > 0 ? containerWidth : 100;
            height = parseFloat(textStyle.fontSize as string) * 1.5 || 24;
          }

          if (mobileAdjust && isMobile) {
            const maxWidth = window.innerWidth * 0.9; // 90% de la largeur de l'écran
            if (width > maxWidth) {
              const scale = maxWidth / width;
              width = maxWidth;
              height = height * scale;
            }
          }
          
          setDimensions({
            width,
            height,
          });
          setIsReady(true);
        } catch (error) {
          console.warn("Error measuring text dimensions:", error);
          
          // Fallback dimensions
          const fallbackWidth = containerRef.current.offsetWidth || window.innerWidth * 0.8;
          const fallbackHeight = parseFloat(textStyle.fontSize as string) * 1.5 || 24;
          
          setDimensions({
            width: fallbackWidth,
            height: fallbackHeight
          });
          setIsReady(true);
        }
      }
    }, 100);

    // Ajout d'un ResizeObserver pour surveiller les changements de taille du conteneur
    if (containerRef.current && !resizeObserver) {
      const observer = new ResizeObserver(updateDimensions);
      observer.observe(containerRef.current);
      setResizeObserver(observer);
    }

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => {
      window.removeEventListener("resize", updateDimensions);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [children, fontSize, isMobile, mobileAdjust, textStyle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size with device pixel ratio for better rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    
    // Scale the context to ensure correct drawing operations
    ctx.scale(dpr, dpr);
    
    // Style du canvas pour qu'il s'adapte à l'espace disponible
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    let time = 0;
    const baseSpeed = 0.008; // Original speed as base unit

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      time += baseSpeed * speed;

      colors.forEach((color, i) => {
        const x =
          (canvas.width / dpr) *
          (0.5 +
            Math.cos(time * 0.8 + i * 1.3) * 0.4 +
            Math.sin(time * 0.5 + i * 0.7) * 0.2);
        const y =
          (canvas.height / dpr) *
          (0.5 +
            Math.sin(time * 0.7 + i * 1.5) * 0.4 +
            Math.cos(time * 0.6 + i * 0.8) * 0.2);

        const gradient = ctx.createRadialGradient(
          x,
          y,
          0,
          x,
          y,
          (canvas.width / dpr) * 0.4,
        );

        gradient.addColorStop(0, `${color}99`);
        gradient.addColorStop(0.5, `${color}33`);
        gradient.addColorStop(1, "#00000000");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      });

      requestAnimationFrame(animate);
    }
    animate();

    return () => {
      // Nettoyer le canvas lors du démontage
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [dimensions, colors, speed]);

  return (
    <span
      ref={containerRef}
      className={`relative inline-block align-middle ${className}`}
      style={{
        width: dimensions.width || "auto",
        height: dimensions.height || "auto",
        maxWidth: "100%", 
        display: "inline-block",
        overflowWrap: "break-word",
      }}
    >
      {/* Hidden text for SEO */}
      <span className="sr-only">{children}</span>

      {/* Visual placeholder while canvas loads */}
      <span
        style={{
          opacity: isReady ? 0 : 1,
          transition: "opacity 0.2s ease-in",
          position: isReady ? "absolute" : "relative",
          display: "inline-block",
          whiteSpace: mobileAdjust && isMobile ? "normal" : "nowrap",
          maxWidth: "100%",
        }}
        aria-hidden="true"
      >
        {children}
      </span>

      <div
        className="absolute inset-0"
        style={{
          opacity: isReady ? 1 : 0,
          transition: "opacity 0.2s ease-in",
          maxWidth: "100%",
          width: dimensions.width || "auto",
          height: dimensions.height || "auto",
        }}
        aria-hidden="true"
      >
        <svg
          width={dimensions.width || "100%"}
          height={dimensions.height || "100%"}
          className="absolute inset-0"
          style={{ maxWidth: "100%", overflow: "visible" }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <clipPath id={maskId}>
              <text
                ref={textRef}
                x="50%"
                y="50%"
                dominantBaseline="middle"
                textAnchor="middle"
                style={{
                  ...textStyle as CSSProperties,
                  whiteSpace: mobileAdjust && isMobile ? "normal" : "nowrap",
                  maxWidth: "100%",
                }}
              >
                {children}
              </text>
            </clipPath>
          </defs>
        </svg>

        <canvas
          ref={canvasRef}
          style={{
            clipPath: `url(#${maskId})`,
            WebkitClipPath: `url(#${maskId})`,
            maxWidth: "100%",
            width: "100%",
            height: "100%",
            display: "block",
          }}
          className="h-full w-full"
        />
      </div>
    </span>
  );
}
