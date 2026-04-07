import React from 'react';
import { motion } from 'framer-motion';

/**
 * SplitText - Animated text component using Framer Motion
 * Converted from GSAP to Framer Motion (P1 audit fix)
 */

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.1,
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 16, rotateX: -12 },
  show: { 
    opacity: 1, 
    y: 0, 
    rotateX: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24
    }
  }
};

const SplitText = ({
  text,
  className = '',
  splitType = 'words',
  disabled = false,
  tag = 'span',
}) => {
  if (disabled || !text) {
    const Tag = tag;
    return <Tag className={className}>{text}</Tag>;
  }

  const segments = splitType === 'words' 
    ? text.split(' ')
    : Array.from(text);

  const Tag = motion[tag] || motion.span;

  return (
    <Tag
      className={className}
      variants={container}
      initial="hidden"
      animate="show"
      style={{ display: 'inline-block' }}
    >
      {segments.map((segment, index) => (
        <motion.span
          key={index}
          variants={item}
          style={{ display: 'inline-block', marginRight: splitType === 'words' ? '0.25em' : 0 }}
        >
          {segment}
        </motion.span>
      ))}
    </Tag>
  );
};

export default SplitText;
