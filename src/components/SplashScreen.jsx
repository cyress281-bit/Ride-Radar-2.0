import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function SplashScreen({ onComplete }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Stage 0: Black Screen (0 - 300ms)
    // Stage 1: Ride & Draw EKG (300ms - 1800ms)
    // Stage 2: Stop & Pulse (1800ms - 2800ms)
    // Stage 3: Hold Logo (2800ms - 3300ms)
    // Exit & Unmount (3300ms+)
    
    const t1 = setTimeout(() => setStage(1), 300);
    const t2 = setTimeout(() => setStage(2), 1800); 
    const t3 = setTimeout(() => setStage(3), 2800); 
    const t4 = setTimeout(() => onComplete(), 3300); 

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  // We mathematically split the image at 65% to separate the EKG line from the bike.
  // This allows us to perfectly sync the wipe-reveal of the line with the physical translation of the bike.
  const splitPercent = 65; 
  const rightClip = 100 - splitPercent; 

  return (
    <motion.div
      key="splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden"
    >
      <div className="relative w-[90vw] max-w-[500px]">
        {/* Invisible reference image to lock the exact aspect ratio perfectly */}
        <img 
          src="https://media.base44.com/images/public/69eaf617762119e163948021/010dd6122_Neonheartbeatmotorcyclelogo.png" 
          className="w-full h-auto opacity-0 pointer-events-none"
          alt=""
        />

        {/* 1. The Trail Layer (EKG) */}
        {/* Wipes from left to right, revealing the EKG line precisely tracking behind the bike */}
        <motion.div
          className="absolute inset-0"
          initial={{ clipPath: `inset(0 100% 0 0)` }}
          animate={stage >= 1 ? { clipPath: `inset(0 ${rightClip}% 0 0)` } : {}}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        >
          <img 
            src="https://media.base44.com/images/public/69eaf617762119e163948021/010dd6122_Neonheartbeatmotorcyclelogo.png" 
            alt=""
            className="w-full h-full object-contain"
          />
        </motion.div>

        {/* 2. The Moving Bike Layer */}
        {/* Isolates the right 35% (the bike) and physically translates it across the screen */}
        <motion.div
          className="absolute inset-0"
          initial={{ x: `-${splitPercent}%` }}
          animate={stage >= 1 ? { x: "0%" } : {}}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          style={{ clipPath: `inset(0 0 0 ${splitPercent}%)` }}
        >
          <img 
            src="https://media.base44.com/images/public/69eaf617762119e163948021/010dd6122_Neonheartbeatmotorcyclelogo.png" 
            alt=""
            className="w-full h-full object-contain"
          />
        </motion.div>

        {/* 3. The Pulse Layer */}
        {/* Adds the intense "heartbeat" glow after the bike stops, then settles into the clean logo */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0, filter: 'brightness(1) blur(0px)' }}
          animate={
            stage === 2 ? { 
              opacity: [0, 1, 0],
              filter: ['brightness(1) blur(0px)', 'brightness(1.5) blur(4px)', 'brightness(1) blur(0px)'],
              scale: [1, 1.02, 1]
            } : { opacity: 0 }
          }
          transition={{ duration: 1.0, ease: "easeInOut" }}
        >
          <img 
            src="https://media.base44.com/images/public/69eaf617762119e163948021/010dd6122_Neonheartbeatmotorcyclelogo.png" 
            alt="Ride Radar"
            className="w-full h-full object-contain"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}