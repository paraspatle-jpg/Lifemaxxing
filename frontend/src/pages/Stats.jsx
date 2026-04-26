import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import api from "../api/client";
import SpiderGraph from "../components/SpiderGraph";
import Heatmap from "../components/Heatmap";
import clsx from "clsx";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const ATTR_CONFIG = {
  creativity:  { emoji: "🎨", bar: "bg-purple-500", glow: "shadow-purple-500/20" },
  physicality: { emoji: "💪", bar: "bg-orange-500", glow: "shadow-orange-500/20" },
  mentality:   { emoji: "🧠", bar: "bg-blue-500",   glow: "shadow-blue-500/20"   },
  social:      { emoji: "🤝", bar: "bg-green-500",  glow: "shadow-green-500/20"  },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { ease: [0.23, 1, 0.32, 1], duration: 0.4 } },
};

export default function Stats() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get("/dashboard/stats").then((r) => r.data),
  });
  const { data: weekly } = useQuery({
    queryKey: ["weekly"],
    queryFn: () => api.get("/dashboard/weekly").then((r) => r.data),
  });
  const { data: heatmapData = [] } = useQuery({
    queryKey: ["heatmap"],
    queryFn: () => api.get("/dashboard/heatmap").then((r) => r.data),
  });

  if (isLoading) return (
    <div className="animate-pulse space-y-4">
      {[1,2,3,4].map((i) => <div key={i} className="h-28 bg-gray-800 rounded-2xl" />)}
    </div>
  );

  const maxAttrXP = Math.max(...(data?.attributes?.map((a) => a.total_xp) ?? [1]), 1);
  const maxMonthXP = Math.max(...(data?.monthly?.map((m) => m.total_xp) ?? [1]), 1);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      <motion.h1 variants={item} className="text-2xl font-bold">Stats</motion.h1>

      {/* Top totals */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3">
        <StatBox value={data?.total_xp ?? 0} label="Total XP" icon="⚡" />
        <StatBox value={`${data?.streak?.longest ?? 0}d`} label="Best Streak" icon="🔥" />
      </motion.div>

      {/* Spider graph */}
      <motion.div variants={item}>
        <SpiderGraph attributes={data?.attributes} />
      </motion.div>

      {/* Heatmap */}
      <motion.div variants={item}>
        <Heatmap data={heatmapData} />
      </motion.div>

      {/* Attribute XP bars */}
      <motion.div variants={item}>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">All-Time XP</p>
        <div className="space-y-3">
          {data?.attributes?.map((a, i) => {
            const cfg = ATTR_CONFIG[a.attribute];
            return (
              <motion.div
                key={a.attribute}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, ease: [0.23, 1, 0.32, 1], duration: 0.4 }}
                className={clsx("bg-gray-900 rounded-2xl p-4 border border-gray-800 shadow-lg", cfg.glow)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize flex items-center gap-1.5">
                    {cfg.emoji} {a.attribute}
                  </span>
                  <span className="text-sm text-gray-300 tabular-nums">
                    Lv <span className="font-bold text-white">{a.level}</span>
                    {" · "}{a.total_xp} XP
                    {" · "}<span className="text-gray-500">{a.title}</span>
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className={clsx("h-full rounded-full", cfg.bar)}
                    initial={{ width: 0 }}
                    animate={{ width: `${(a.total_xp / maxAttrXP) * 100}%` }}
                    transition={{ duration: 1, delay: i * 0.1, ease: [0.23, 1, 0.32, 1] }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* This week */}
      {weekly && (
        <motion.div variants={item}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">This Week</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <StatBox value={weekly.total_xp} label="XP this week" icon="📈" />
            <StatBox value={weekly.tasks_completed} label="tasks done" icon="✅" />
          </div>
          {Object.keys(weekly.xp_by_attribute).length > 0 && (
            <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800 space-y-2">
              {Object.entries(weekly.xp_by_attribute).map(([attr, xp]) => (
                <div key={attr} className="flex items-center justify-between text-sm">
                  <span className="capitalize flex items-center gap-1">
                    {ATTR_CONFIG[attr]?.emoji} {attr}
                  </span>
                  <span className="text-yellow-400 font-bold">+{xp} XP</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Monthly bar chart */}
      {data?.monthly?.length > 0 && (
        <motion.div variants={item}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Monthly XP</p>
          <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <div className="flex items-end gap-1.5 h-28">
              {data.monthly.slice(-12).map((m, i) => (
                <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    className="w-full bg-indigo-500 rounded-t-sm"
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max((m.total_xp / maxMonthXP) * 88, 4)}px` }}
                    transition={{ duration: 0.6, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
                    title={`${m.total_xp} XP`}
                  />
                  <span className="text-xs text-gray-600">{MONTHS[m.month - 1]}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function StatBox({ value, label, icon }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="bg-gray-900 rounded-2xl p-4 border border-gray-800 flex items-center gap-3"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-2xl font-black tabular-nums">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </motion.div>
  );
}
