"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

type AnimatedHeroMediaProps = {
  alt: string;
  height: number;
  src: string;
  width: number;
};

export const AnimatedHeroMedia = ({ alt, height, src, width }: AnimatedHeroMediaProps) => {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, x: 0 }}
      className="public-poster-media public-image-surface"
      initial={{ opacity: 0, scale: 0.94, x: 40 }}
      transition={{ delay: 0.25, duration: 0.95, ease: EASE_OUT }}
    >
      <motion.div
        animate={{ y: [0, -14, 0] }}
        style={{ height: "100%", minHeight: "inherit" }}
        transition={{
          duration: 5.5,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "loop",
        }}
      >
        <Image
          alt={alt}
          className="public-image public-image-cover public-image-position-center"
          height={height}
          priority
          quality={92}
          sizes="(max-width: 980px) 100vw, 56vw"
          src={src}
          width={width}
        />
      </motion.div>
    </motion.div>
  );
};
