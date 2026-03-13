"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  fontSize?: number;
  useThousandsSeparator?: boolean;
  animateToNumber?: number;
  duration?: number;
  delay?: number;
  decimals?: number;
}

interface RollingDigitProps {
  targetDigit: string;
  fontSize: number;
  delay: number;
  duration: number;
}

const RollingDigit: React.FC<RollingDigitProps> = ({
  targetDigit,
  fontSize,
  delay,
  duration,
}) => {
  // If it's not a digit, just show it without animation
  if (!/\d/.test(targetDigit)) {
    return (
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay }}
        style={{
          fontSize,
          fontFeatureSettings: '"tnum"',
          lineHeight: "1",
          display: "inline",
          verticalAlign: "text-bottom",
        }}
      >
        {targetDigit}
      </motion.span>
    );
  }

  const target = parseInt(targetDigit);
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Create sequence: 0 through target digit
  const digitSequence = digits.slice(0, target + 1);
  const finalOffset = -target * fontSize;

  return (
    <span
      className="relative overflow-hidden"
      style={{
        height: "1em",
        width: "0.6em",
        fontSize,
        fontFeatureSettings: '"tnum"',
        lineHeight: "1",
        display: "inline-block",
        verticalAlign: "text-bottom",
      }}
    >
      <motion.span
        className="absolute flex flex-col"
        initial={{ y: 0 }}
        animate={{ y: finalOffset }}
        transition={{
          duration,
          delay,
          ease: "easeOut",
        }}
        style={{
          fontSize,
          fontFeatureSettings: '"tnum"',
          lineHeight: "inherit",
        }}
      >
        {digitSequence.map((digit, index) => (
          <span
            key={index}
            className="flex items-center justify-center"
            style={{
              height: "1em",
              fontSize,
              fontFeatureSettings: '"tnum"',
              lineHeight: "1",
            }}
          >
            {digit}
          </span>
        ))}
      </motion.span>
    </span>
  );
};

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  className,
  prefix = "",
  suffix = "",
  fontSize = 24,
  useThousandsSeparator = true,
  animateToNumber,
  duration = 0.3,
  delay = 0,
  decimals = 0,
}) => {
  const targetValue = animateToNumber || value;

  const formatNumber = (num: number): string => {
    if (useThousandsSeparator) {
      // Handle decimal places properly
      const parts = num.toFixed(decimals).split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

      // Remove trailing zeros and decimal point if not needed
      if (decimals === 0 || parts[1] === "0".repeat(decimals)) {
        return parts[0];
      }
      return parts.join(".");
    }
    return decimals > 0 ? num.toFixed(decimals) : num.toString();
  };

  const formattedNumber = formatNumber(targetValue);
  const characters = formattedNumber.split("");

  return (
    <motion.span
      className={cn("tabular-nums", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay }}
      style={{
        fontSize,
        fontFeatureSettings: '"tnum"',
        lineHeight: "1",
        display: "inline",
        verticalAlign: "baseline",
      }}
    >
      {prefix && (
        <span
          style={{
            fontSize,
            fontFeatureSettings: '"tnum"',
            lineHeight: "1",
            verticalAlign: "text-bottom",
          }}
        >
          {prefix}
        </span>
      )}
      {characters.map((char, index) => (
        <RollingDigit
          key={`${char}-${index}`}
          targetDigit={char}
          fontSize={fontSize}
          delay={delay + index * 0.03}
          duration={duration}
        />
      ))}
      {suffix && (
        <span
          style={{
            fontSize,
            fontFeatureSettings: '"tnum"',
            lineHeight: "1",
            verticalAlign: "text-bottom",
          }}
        >
          {suffix}
        </span>
      )}
    </motion.span>
  );
};

export default AnimatedNumber;
