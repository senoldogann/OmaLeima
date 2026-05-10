"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

type GalleryImage = { alt: string; src: string };

type AnimatedGalleryGridProps = {
  images: ReadonlyArray<GalleryImage>;
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.65, ease: EASE_OUT },
  },
};

export const AnimatedGalleryGrid = ({ images }: AnimatedGalleryGridProps) => {
  return (
    <motion.div
      className="public-gallery-grid"
      initial="hidden"
      variants={containerVariants}
      viewport={{ amount: 0.1, once: true }}
      whileInView="visible"
    >
      {images.map((img) => (
        <motion.div
          key={img.src}
          className="public-gallery-item"
          style={{ cursor: "pointer", overflow: "hidden" }}
          variants={itemVariants}
          whileHover={{
            boxShadow: "0 16px 48px rgba(200, 255, 71, 0.14)",
            scale: 1.04,
            transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
            y: -6,
          }}
        >
          <Image
            alt={img.alt}
            className="public-image public-image-cover public-image-position-center"
            fill
            sizes="(max-width: 640px) calc(50vw - 28px), (max-width: 980px) calc(50vw - 36px), calc(25vw - 24px)"
            src={img.src}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};
