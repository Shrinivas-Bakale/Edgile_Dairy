import React from "react";
import { motion } from "framer-motion";
import { Box, styled, useTheme } from "@mui/material";
import type { Theme } from "@mui/material/styles";

interface GridLineProps {
  direction?: "horizontal" | "vertical";
}

const GridLine = styled(Box, {
  shouldForwardProp: (prop) => prop !== "direction",
})<GridLineProps>(({ theme, direction = "horizontal" }) => ({
  position: "absolute",
  ...(direction === "horizontal"
    ? {
        height: "1px",
        width: "calc(100% + 20px)",
        top: "-2px",
        left: "-10px",
      }
    : {
        width: "1px",
        height: "calc(100% + 20px)",
        left: "-2px",
        top: "-10px",
      }),
  backgroundImage:
    "linear-gradient(to right, rgba(255, 255, 255, 0.15), transparent)",
  backgroundSize: direction === "horizontal" ? "5px 1px" : "1px 5px",
  zIndex: 30,
}));

const techImages = [
  "/images/tech/circuit1.jpg",
  "/images/tech/code1.jpg",
  "/images/tech/device1.jpg",
  "/images/tech/server1.jpg",
  "/images/tech/circuit2.jpg",
  "/images/tech/code2.jpg",
  "/images/tech/device2.jpg",
  "/images/tech/server2.jpg",
];

const fallbackImages = [
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800",
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800",
  "https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=800",
  "https://images.unsplash.com/photo-1624969862293-b749659a90d4?w=800",
  "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=800",
  "https://images.unsplash.com/photo-1562408590-e32931084e23?w=800",
  "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800",
];

interface ThreeDMarqueeProps {
  images?: string[];
  className?: string;
}

export const ThreeDMarquee: React.FC<ThreeDMarqueeProps> = ({
  images = fallbackImages,
  className,
}) => {
  const theme = useTheme();
  const chunkSize = Math.ceil(images.length / 4);
  const chunks = Array.from({ length: 4 }, (_, i) =>
    images.slice(i * chunkSize, (i + 1) * chunkSize)
  );

  return (
    <Box
      className={className}
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        mx: "auto",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        zIndex: 0,
        background: "linear-gradient(to bottom, #000000, #090909, #101010)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          width: "100%",
        }}
      >
        <Box
          sx={{
            width: { xs: "100%", md: "2000px" },
            height: { xs: "100%", md: "2000px" },
            transform: {
              xs: "scale(0.45) translateY(-30%)",
              sm: "scale(0.6) translateY(-10%)",
              md: "scale(0.85)",
              lg: "scale(1)",
            },
          }}
        >
          <Box
            sx={{
              position: "relative",
              top: "50%",
              left: "50%",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: { xs: 3, sm: 4, md: 5 },
              transformStyle: "preserve-3d",
              transform: "translate(-50%, -50%) rotateX(55deg) rotateZ(-40deg)",
              perspective: "1200px",
            }}
          >
            {chunks.map((subarray, colIndex) => (
              <motion.div
                animate={{ y: colIndex % 2 === 0 ? [0, 50, 0] : [0, -50, 0] }}
                transition={{
                  duration: 20,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatType: "mirror",
                }}
                key={colIndex}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "30px",
                  position: "relative",
                }}
              >
                <GridLine direction="vertical" />
                {subarray.map((image, i) => (
                  <Box key={i} sx={{ position: "relative" }}>
                    <GridLine direction="horizontal" />
                    <motion.div
                      whileHover={{
                        scale: 1.1,
                        rotateX: 10,
                        boxShadow: "0 40px 80px rgba(0, 0, 0, 0.9)",
                      }}
                      transition={{
                        duration: 0.4,
                        ease: "easeOut",
                        scale: {
                          type: "spring",
                          stiffness: 500,
                          damping: 25,
                        },
                      }}
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "250px",
                        borderRadius: 16,
                        overflow: "hidden",
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.7)",
                        transformStyle: "preserve-3d",
                        perspective: "1200px",
                      }}
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          backgroundImage: `url(${image})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          filter: "brightness(0.9) contrast(1.3)",
                        }}
                      />
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          background:
                            "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.9))",
                        }}
                      />
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          background:
                            "linear-gradient(135deg, rgba(120, 85, 230, 0.1) 0%, transparent 100%)",
                          borderTop: "1px solid rgba(255, 255, 255, 0.15)",
                          borderLeft: "1px solid rgba(255, 255, 255, 0.15)",
                        }}
                      />
                    </motion.div>
                  </Box>
                ))}
              </motion.div>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ThreeDMarquee;
