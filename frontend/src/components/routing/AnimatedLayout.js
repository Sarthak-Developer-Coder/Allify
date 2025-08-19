import React from "react";
import { useLocation, Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import App from "../../App";
import ButterflyField from "../ui/ButterflyField";

export default function AnimatedLayout({ token }) {
  const location = useLocation();
  return (
    <>
      {/* Background butterflies */}
      <ButterflyField count={20} />
      <App token={token} />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </>
  );
}
