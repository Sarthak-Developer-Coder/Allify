import React from "react";
import { useLocation, Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import App from "../../App";
import ButterflyField from "../ui/ButterflyField";
import CritterFlight from "../ui/CritterFlight";
import LeafFall from "../ui/LeafFall";
import HeartFloaters from "../ui/HeartFloaters";
import RainOverlay from "../ui/RainOverlay";
import ThunderOverlay from "../ui/ThunderOverlay";
import RoseFloaters from "../ui/RoseFloaters";
import SunflowerFloaters from "../ui/SunflowerFloaters";

export default function AnimatedLayout({ token }) {
  const location = useLocation();
  return (
    <>
  {/* Background butterflies and dragon */}
  <ButterflyField count={20} />
  <CritterFlight count={8} />
  <LeafFall count={20} />
  <HeartFloaters count={14} />
  <RoseFloaters count={10} />
  <SunflowerFloaters count={8} />
  <RainOverlay count={80} speed={1} />
  <ThunderOverlay flashEverySec={[3,7]} boltCount={6} flashStrength={0.55} />
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
