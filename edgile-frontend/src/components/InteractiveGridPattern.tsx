import React, { useRef, useEffect, useState } from "react";
import { Box, styled, useTheme, SxProps, Theme } from "@mui/material";

interface InteractiveGridPatternProps {
  className?: string;
  dotColor?: string;
  dotSize?: number;
  dotSpacing?: number;
  dotOpacity?: number;
  blur?: number;
  interactive?: boolean;
  speed?: number;
  sx?: SxProps<Theme>;
}

interface StyledGridProps {
  dotColor: string;
  dotSize: number;
  dotSpacing: number;
  dotOpacity: number;
  blur: number;
}

const StyledGrid = styled(Box, {
  shouldForwardProp: (prop) => !['dotColor', 'dotSize', 'dotSpacing', 'dotOpacity', 'blur'].includes(prop as string),
})<StyledGridProps>(({ dotColor, dotSize, dotSpacing, dotOpacity, blur }) => ({
  position: "absolute",
  inset: 0,
  backgroundImage: `radial-gradient(${dotColor} ${dotSize}px, transparent 0)`,
  backgroundSize: `${dotSpacing}px ${dotSpacing}px`,
  backgroundPosition: "0 0",
  opacity: dotOpacity,
  filter: `blur(${blur}px)`,
  pointerEvents: "none",
  transition: "transform 0.2s ease",
  maskImage: "radial-gradient(circle at center, white, transparent)",
}));

export const InteractiveGridPattern: React.FC<InteractiveGridPatternProps> = ({
  className,
  dotColor = "rgba(124, 58, 237, 0.8)",
  dotSize = 1.5,
  dotSpacing = 30,
  dotOpacity = 0.6,
  blur = 0.5,
  interactive = true,
  speed = 0.075,
  sx,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const theme = useTheme();

  // If in dark mode, use the provided dotColor, otherwise adjust for light mode
  const effectiveDotColor = theme.palette.mode === "dark" 
    ? dotColor
    : "rgba(75, 85, 99, 0.6)";

  useEffect(() => {
    if (!interactive || !gridRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Calculate mouse position relative to the element
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      // Center the coordinates (0,0 is center)
      const centerX = x - 0.5;
      const centerY = y - 0.5;

      // Update position state with some damping
      setPosition((prev) => ({
        x: prev.x + (centerX - prev.x) * speed,
        y: prev.y + (centerY - prev.y) * speed,
      }));
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [interactive, speed]);

  return (
    <StyledGrid
      ref={gridRef}
      className={className}
      dotColor={effectiveDotColor}
      dotSize={dotSize}
      dotSpacing={dotSpacing}
      dotOpacity={dotOpacity}
      blur={blur}
      sx={{
        transform: interactive 
          ? `translate(${position.x * 10}px, ${position.y * 10}px)` 
          : "none",
        ...sx
      }}
    />
  );
};

export default InteractiveGridPattern; 