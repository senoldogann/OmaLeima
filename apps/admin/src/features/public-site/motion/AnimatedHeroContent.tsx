"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { ContactIcon } from "@/features/public-site/public-icons";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

type StatItem = { label: string; value: string };

type AnimatedHeroContentProps = {
  applyHref: string;
  applyLabel: string;
  contactHref: string;
  contactLabel: string;
  description: string;
  eyebrow: string;
  heroTitle: string;
  sectionLabel: string;
  statItems: ReadonlyArray<StatItem>;
};

const containerVariants = {
  hidden: {},
  visible: { transition: { delayChildren: 0.15, staggerChildren: 0.13 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, ease: EASE_OUT },
  },
};

const statVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.92 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: EASE_OUT },
  },
};

export const AnimatedHeroContent = ({
  applyHref,
  applyLabel,
  contactHref,
  contactLabel,
  description,
  eyebrow,
  heroTitle,
  sectionLabel,
  statItems,
}: AnimatedHeroContentProps) => {
  return (
    <motion.div
      animate="visible"
      className="public-poster-copy"
      initial="hidden"
      variants={containerVariants}
    >
      {/* Animated lime accent line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.1, duration: 0.55, ease: EASE_OUT }}
        style={{
          backgroundColor: "#C8FF47",
          borderRadius: 2,
          height: 3,
          marginBottom: 20,
          originX: 0,
          width: 44,
        }}
      />

      <motion.p className="eyebrow" variants={itemVariants}>
        {eyebrow}
      </motion.p>

      <motion.h1 id="public-title" variants={itemVariants}>
        {heroTitle}
      </motion.h1>

      <motion.p className="public-poster-description" variants={itemVariants}>
        {description}
      </motion.p>

      <motion.div className="public-actions" variants={itemVariants}>
        <Link className="button button-primary" href={applyHref}>
          {applyLabel}
        </Link>
        <Link className="button button-secondary" href={contactHref}>
          <ContactIcon className="public-inline-icon" />
          {contactLabel}
        </Link>
      </motion.div>

      <motion.div
        aria-label={sectionLabel}
        className="public-poster-stat-row"
        variants={containerVariants}
      >
        {statItems.map((item) => (
          <motion.article
            key={item.label}
            className="public-poster-stat"
            variants={statVariants}
            whileHover={{
              borderColor: "rgba(200, 255, 71, 0.3)",
              boxShadow: "0 0 24px rgba(200, 255, 71, 0.1)",
              transition: { duration: 0.2 },
            }}
          >
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </motion.article>
        ))}
      </motion.div>
    </motion.div>
  );
};
