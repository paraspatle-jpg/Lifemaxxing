import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/client";
import AttributeCard from "../components/AttributeCard";

const ATTR_EMOJI = { creativity: "🎨", physicality: "💪", mentality: "🧠", social: "🤝" };

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { ease: [0.23, 1, 0.32, 1], duration: 0.4 } },
};

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/dashboard").then((r) => r.data),
  });

  if (isLoading) return <Skeleton />;

  const { attributes, current_streak, longest_streak, today_logs, today_xp, user } = data;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hey, {user.username} 👋</h1>
          <p className="text-gray-400 text-sm mt-0.5">Keep pushing. Every day counts.</p>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
          <Link
            to="/log"
            className="bg-white text-gray-950 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            + Log Today
          </Link>
        </motion.div>
      </motion.div>

      {/* Stats row */}
      <motion.div variants={item} className="grid grid-cols-3 gap-3">
        <StatBox label="Streak" value={`${current_streak}d`} sub="current" highlight={current_streak >= 7} />
        <StatBox label="Best" value={`${longest_streak}d`} sub="all-time" />
        <StatBox label="Today" value={`+${today_xp} XP`} sub={`${today_logs.length} tasks`} highlight={today_xp > 0} />
      </motion.div>

      {/* Attributes */}
      <motion.div variants={item}>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Attributes</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {attributes.map((a, i) => (
            <AttributeCard key={a.attribute} attr={a} index={i} />
          ))}
        </div>
      </motion.div>

      {/* Today's activity */}
      <motion.div variants={item}>
        {today_logs.length > 0 ? (
          <>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Today's Activity</p>
            <motion.div className="space-y-2" variants={container} initial="hidden" animate="show">
              <AnimatePresence>
                {today_logs.map((log) => (
                  <motion.div
                    key={log.id}
                    variants={item}
                    layout
                    className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span>{ATTR_EMOJI[log.attribute]}</span>
                      <span className="text-sm">{log.task_name}</span>
                    </div>
                    <motion.span
                      className="text-sm font-bold text-yellow-400"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      +{log.xp_earned} XP
                    </motion.span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        ) : (
          <motion.div
            variants={item}
            className="text-center py-10 text-gray-600 border border-dashed border-gray-800 rounded-2xl"
          >
            <motion.p
              className="text-4xl mb-3"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              🎯
            </motion.p>
            <p className="text-sm">Nothing logged yet today.</p>
            <Link to="/log" className="text-white underline text-sm mt-1 inline-block">
              Log your first task
            </Link>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

function StatBox({ label, value, sub, highlight }) {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      className={`bg-gray-900 rounded-xl p-4 text-center border transition-colors ${
        highlight ? "border-yellow-700/60 shadow-yellow-900/20 shadow-lg" : "border-gray-800"
      }`}
    >
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xs text-gray-600">{sub}</p>
    </motion.div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-48" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-800 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-gray-800 rounded-xl" />)}
      </div>
    </div>
  );
}
