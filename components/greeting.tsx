import { motion } from "framer-motion";

export const Greeting = () => {
  return (
    <div
      className="mx-auto flex size-full max-w-3xl flex-col items-center justify-center px-4"
      key="overview"
    >
      <motion.h1
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 text-3xl font-semibold tracking-tight text-black"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        What can I help with?
      </motion.h1>
    </div>
  );
};
