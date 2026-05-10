"use client";

import { motion } from "framer-motion";

export const FloatingOrbs = () => {
  return (
    <div
      aria-hidden="true"
      style={{
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        position: "absolute",
        zIndex: 0,
      }}
    >
      {/* Large lime glow — top right */}
      <motion.div
        animate={{ scale: [1, 1.25, 1], x: [0, 40, 0], y: [0, -25, 0] }}
        style={{
          background:
            "radial-gradient(circle, rgba(200, 255, 71, 0.13) 0%, transparent 68%)",
          borderRadius: "50%",
          filter: "blur(48px)",
          height: 480,
          position: "absolute",
          right: "-8%",
          top: "-15%",
          width: 480,
        }}
        transition={{ duration: 9, ease: "easeInOut", repeat: Infinity }}
      />

      {/* Small lime glow — bottom left */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], x: [0, -24, 0], y: [0, 18, 0] }}
        style={{
          background:
            "radial-gradient(circle, rgba(200, 255, 71, 0.08) 0%, transparent 70%)",
          borderRadius: "50%",
          bottom: "5%",
          filter: "blur(60px)",
          height: 360,
          left: "-6%",
          position: "absolute",
          width: 360,
        }}
        transition={{ delay: 2.5, duration: 11, ease: "easeInOut", repeat: Infinity }}
      />

      {/* Subtle center accent */}
      <motion.div
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.9, 1.05, 0.9] }}
        style={{
          background:
            "radial-gradient(circle, rgba(200, 255, 71, 0.05) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(80px)",
          height: 300,
          left: "35%",
          position: "absolute",
          top: "30%",
          width: 300,
        }}
        transition={{ delay: 1, duration: 7, ease: "easeInOut", repeat: Infinity }}
      />
    </div>
  );
};
