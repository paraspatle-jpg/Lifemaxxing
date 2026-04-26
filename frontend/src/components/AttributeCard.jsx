import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import clsx from "clsx";

const ATTR_CONFIG = {
  creativity:  { emoji: "🎨", color: "bg-purple-500", glow: "shadow-purple-500/30", track: "bg-purple-950", text: "text-purple-400", border: "border-purple-800/60", gradient: "from-purple-950/60 to-gray-900" },
  physicality: { emoji: "💪", color: "bg-orange-500", glow: "shadow-orange-500/30", track: "bg-orange-950", text: "text-orange-400", border: "border-orange-800/60", gradient: "from-orange-950/60 to-gray-900" },
  mentality:   { emoji: "🧠", color: "bg-blue-500",   glow: "shadow-blue-500/30",   track: "bg-blue-950",   text: "text-blue-400",   border: "border-blue-800/60",   gradient: "from-blue-950/60 to-gray-900"   },
  social:      { emoji: "🤝", color: "bg-green-500",  glow: "shadow-green-500/30",  track: "bg-green-950",  text: "text-green-400",  border: "border-green-800/60",  gradient: "from-green-950/60 to-gray-900"  },
};

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const end = value;
    const startTime = performance.now();
    const duration = 800;
    function tick(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(end * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <span>{display}</span>;
}

export default function AttributeCard({ attr, index = 0 }) {
  const navigate = useNavigate();
  const cfg = ATTR_CONFIG[attr.attribute] ?? ATTR_CONFIG.mentality;
  const pct = Math.min(attr.percent_to_next, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/tasks?attribute=${attr.attribute}`)}
      className={clsx(
        "rounded-2xl border bg-gradient-to-br p-4 shadow-lg cursor-pointer",
        cfg.border, cfg.gradient, cfg.glow
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <motion.span className="text-2xl"
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
            {cfg.emoji}
          </motion.span>
          <div>
            <p className="font-semibold capitalize">{attr.attribute}</p>
            <p className={clsx("text-xs font-medium", cfg.text)}>{attr.title}</p>
          </div>
        </div>
        <div className="text-right">
          <motion.p className="text-3xl font-black tabular-nums"
            key={attr.level} initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            {attr.level}
          </motion.p>
          <p className="text-xs text-gray-500">Level</p>
        </div>
      </div>

      <div className={clsx("h-2.5 rounded-full overflow-hidden", cfg.track)}>
        <motion.div className={clsx("h-full rounded-full", cfg.color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay: index * 0.08 + 0.2, ease: [0.23, 1, 0.32, 1] }} />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-gray-500"><AnimatedNumber value={attr.xp_in_level} /> XP</span>
        <span className="text-xs text-gray-600">{attr.xp_to_next_level} to next</span>
      </div>

      <p className="text-xs text-gray-600 mt-2 text-right">Tap to manage tasks →</p>
    </motion.div>
  );
}
