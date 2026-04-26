import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/client";
import clsx from "clsx";

const ATTRS = ["physicality", "mentality", "creativity", "social"];
const ATTR_CONFIG = {
  creativity:  { emoji: "🎨", color: "border-purple-700/60 bg-purple-950/40", active: "border-purple-400 bg-purple-900/70 shadow-purple-500/20 shadow-lg" },
  physicality: { emoji: "💪", color: "border-orange-700/60 bg-orange-950/40", active: "border-orange-400 bg-orange-900/70 shadow-orange-500/20 shadow-lg" },
  mentality:   { emoji: "🧠", color: "border-blue-700/60 bg-blue-950/40",     active: "border-blue-400 bg-blue-900/70 shadow-blue-500/20 shadow-lg"     },
  social:      { emoji: "🤝", color: "border-green-700/60 bg-green-950/40",   active: "border-green-400 bg-green-900/70 shadow-green-500/20 shadow-lg"  },
};

export default function DailyLog() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedTaskId = searchParams.get("task") ? Number(searchParams.get("task")) : null;

  const [selected, setSelected] = useState(new Set());
  const [filterAttr, setFilterAttr] = useState(null);
  const [xpGained, setXpGained] = useState(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks").then((r) => r.data),
  });

  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/dashboard").then((r) => r.data),
  });

  // Pre-select task from URL param once tasks load
  useEffect(() => {
    if (!preselectedTaskId || !tasks.length) return;
    const task = tasks.find((t) => t.id === preselectedTaskId);
    if (task) {
      setSelected(new Set([preselectedTaskId]));
      setFilterAttr(task.attribute);
    }
  }, [preselectedTaskId, tasks.length]);

  const logMutation = useMutation({
    mutationFn: (task_id) => api.post("/logs", { task_id }).then((r) => r.data),
    onSuccess: (data) => {
      setXpGained((prev) => (prev || 0) + data.xp_earned);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const unlogMutation = useMutation({
    mutationFn: (log_id) => api.delete(`/logs/${log_id}`),
    onSuccess: () => {
      setXpGained(null);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  // Map task_id → log entry for today
  const todayLogMap = Object.fromEntries(
    (dashboard?.today_logs ?? []).map((l) => [l.task_id, l])
  );

  function handleToggle(task) {
    const alreadyLogged = todayLogMap[task.id];
    if (alreadyLogged) return; // handled separately via un-log button
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(task.id) ? s.delete(task.id) : s.add(task.id);
      return s;
    });
  }

  async function handleSubmit() {
    const toLog = [...selected].filter((id) => !todayLogMap[id]);
    for (const id of toLog) await logMutation.mutateAsync(id);
    setSelected(new Set());
  }

  const filtered = filterAttr ? tasks.filter((t) => t.attribute === filterAttr) : tasks;
  const pendingCount = [...selected].filter((id) => !todayLogMap[id]).length;

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Log Today</h1>
        <p className="text-gray-400 text-sm mt-0.5">Select tasks you completed · tap ✓ to un-log.</p>
      </motion.div>

      <AnimatePresence>
        {xpGained !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-yellow-900/30 border border-yellow-600/60 rounded-2xl px-4 py-3 text-yellow-300 font-bold text-center text-lg"
          >
            <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.4 }}>
              ⚡ +{xpGained} XP earned today!
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <FilterPill label="All" active={!filterAttr} onClick={() => setFilterAttr(null)} />
        {ATTRS.map((a) => (
          <FilterPill key={a} label={`${ATTR_CONFIG[a].emoji} ${a}`} active={filterAttr === a}
            onClick={() => setFilterAttr(filterAttr === a ? null : a)} />
        ))}
      </div>

      {/* Task grid */}
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-2" initial="hidden" animate="show"
        variants={{ show: { transition: { staggerChildren: 0.04 } } }}>
        {filtered.map((task) => {
          const cfg = ATTR_CONFIG[task.attribute];
          const isSelected = selected.has(task.id);
          const logEntry = todayLogMap[task.id];
          const isDone = Boolean(logEntry);

          return (
            <motion.div
              key={task.id}
              variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1, transition: { ease: [0.23, 1, 0.32, 1], duration: 0.3 } } }}
              className={clsx(
                "border rounded-xl px-4 py-3 transition-all flex items-center justify-between gap-3",
                isDone
                  ? "border-gray-700/50 bg-gray-800/40 cursor-default"
                  : isSelected
                  ? cfg.active + " cursor-pointer"
                  : cfg.color + " cursor-pointer"
              )}
              onClick={() => !isDone && handleToggle(task)}
            >
              {/* Label */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-base shrink-0">{cfg.emoji}</span>
                <span className={clsx("text-sm font-medium truncate", isDone && "text-gray-400")}>
                  {task.name}
                </span>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-yellow-400 font-semibold">+{task.xp_reward} XP</span>

                <AnimatePresence mode="wait">
                  {isDone ? (
                    <motion.button
                      key="done"
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      onClick={(e) => { e.stopPropagation(); unlogMutation.mutate(logEntry.id); }}
                      disabled={unlogMutation.isPending}
                      title="Tap to un-log"
                      className="w-7 h-7 rounded-full bg-green-900/60 border border-green-600 flex items-center justify-center text-green-400 hover:bg-red-900/60 hover:border-red-600 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      ✓
                    </motion.button>
                  ) : isSelected ? (
                    <motion.span
                      key="selected"
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold"
                    >●</motion.span>
                  ) : (
                    <span key="empty" className="w-7 h-7 rounded-full border border-gray-700" />
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {tasks.length === 0 && (
        <p className="text-center text-gray-500 py-8">
          No tasks yet. <a href="/tasks" className="underline text-gray-300">Create some tasks</a>.
        </p>
      )}

      {/* Sticky submit */}
      <AnimatePresence>
        {pendingCount > 0 && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="sticky bottom-20 flex justify-center">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={handleSubmit} disabled={logMutation.isPending}
              className="bg-white text-gray-950 font-bold px-10 py-3.5 rounded-2xl shadow-2xl hover:bg-gray-100 transition-colors disabled:opacity-60">
              {logMutation.isPending ? "Saving..." : `Log ${pendingCount} task${pendingCount > 1 ? "s" : ""} ⚡`}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterPill({ label, active, onClick }) {
  return (
    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClick}
      className={clsx("whitespace-nowrap px-3 py-1.5 rounded-full text-sm transition-colors capitalize",
        active ? "bg-white text-gray-950 font-semibold" : "bg-gray-800 text-gray-400 hover:bg-gray-700")}>
      {label}
    </motion.button>
  );
}
