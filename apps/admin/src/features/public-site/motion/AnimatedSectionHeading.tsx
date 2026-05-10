"use client";

import { motion } from "framer-motion";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

type AnimatedSectionHeadingProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export const AnimatedSectionHeading = ({
  children,
  className,
  delay = 0,
}: AnimatedSectionHeadingProps) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      transition={{ delay, duration: 0.7, ease: EASE_OUT }}
      viewport={{ amount: 0.2, once: true }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      {children}
    </motion.div>
  );
};
