"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

import {
  QrCodeIcon,
  StarIcon,
  UsersIcon,
} from "@/features/public-site/public-icons";

const CARD_IMAGES = [
  "/images/public/gen-students-group.png",
  "/images/public/gen-scanning-qr.png",
  "/images/public/gen-reward-moment.png",
] as const;

const STEP_ICONS = [UsersIcon, QrCodeIcon, StarIcon] as const;

type StepItem = { body: string; step: string; title: string };

type AnimatedStepsGridProps = {
  items: ReadonlyArray<StepItem>;
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.16 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 52 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: EASE_OUT },
  },
};

export const AnimatedStepsGrid = ({ items }: AnimatedStepsGridProps) => {
  return (
    <motion.div
      className="public-step-grid"
      initial="hidden"
      variants={containerVariants}
      viewport={{ amount: 0.15, once: true }}
      whileInView="visible"
    >
      {items.map((item, index) => {
        const StepIcon = STEP_ICONS[index as 0 | 1 | 2];

        return (
          <motion.article
            key={item.step}
            className="public-step-card"
            style={{ cursor: "default" }}
            variants={cardVariants}
            whileHover={{
              boxShadow: "0 20px 56px rgba(200, 255, 71, 0.12)",
              transition: { duration: 0.25 },
              y: -10,
            }}
          >
            <div className="public-step-image-wrap">
              <Image
                alt=""
                aria-hidden="true"
                className="public-image public-image-cover public-image-position-center"
                fill
                sizes="(max-width: 980px) 100vw, 33vw"
                src={CARD_IMAGES[index as 0 | 1 | 2]}
              />
            </div>
            <div className="public-step-copy">
              <div className="public-step-topline">
                <span className="public-step-number">{item.step}</span>
                {StepIcon && <StepIcon className="public-card-icon" />}
              </div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          </motion.article>
        );
      })}
    </motion.div>
  );
};
