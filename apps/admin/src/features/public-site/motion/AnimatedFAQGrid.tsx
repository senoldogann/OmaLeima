"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

type FAQItem = { answer: string; question: string };

type AnimatedFAQGridProps = {
  items: ReadonlyArray<FAQItem>;
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_OUT },
  },
};

export const AnimatedFAQGrid = ({ items }: AnimatedFAQGridProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <motion.div
      className="public-faq-accordion"
      initial="hidden"
      variants={containerVariants}
      viewport={{ amount: 0.08, once: true }}
      whileInView="visible"
    >
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <motion.div
            key={item.question}
            className={`public-faq-item${isOpen ? " public-faq-item-open" : ""}`}
            variants={rowVariants}
          >
            <button
              aria-expanded={isOpen}
              className="public-faq-trigger"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              type="button"
            >
              <span className="public-faq-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="public-faq-question">{item.question}</span>
              <motion.span
                animate={{ rotate: isOpen ? 45 : 0 }}
                className="public-faq-icon"
                transition={{ duration: 0.25, ease: EASE_OUT }}
              >
                +
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="answer"
                  animate={{ height: "auto", opacity: 1 }}
                  className="public-faq-answer-wrap"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                >
                  <p className="public-faq-answer">{item.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
};
