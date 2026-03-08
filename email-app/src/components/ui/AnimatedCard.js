import { motion } from 'framer-motion';

export default function AnimatedCard({ children, className = '', style = {} }) {
  return (
    <motion.div
      className={className}
      style={style}
      whileHover={{
        y: -3,
        boxShadow: '0 12px 40px rgba(99, 102, 241, 0.18)',
        transition: { duration: 0.18 },
      }}
    >
      {children}
    </motion.div>
  );
}
