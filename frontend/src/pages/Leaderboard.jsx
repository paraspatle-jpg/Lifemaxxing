import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/client";
import clsx from "clsx";

const TITLE_COLOR = {
  Novice:     "text-gray-500",
  Apprentice: "text-blue-400",
  Adept:      "text-green-400",
  Expert:     "text-purple-400",
  Master:     "text-orange-400",
  Elite:      "text-yellow-400",
};

const ATTR_CONFIG = {
  creativity:  { emoji: "🎨", bar: "bg-purple-500", track: "bg-purple-950" },
  physicality: { emoji: "💪", bar: "bg-orange-500", track: "bg-orange-950" },
  mentality:   { emoji: "🧠", bar: "bg-blue-500",   track: "bg-blue-950"   },
  social:      { emoji: "🤝", bar: "bg-green-500",  track: "bg-green-950"  },
};

const RANK_MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function Leaderboard() {
  const [selectedId, setSelectedId] = useState(null);

  const { data: board = [], isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => api.get("/leaderboard").then((r) => r.data),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">Ranked by total XP. Tap a player to see their stats.</p>
      </motion.div>

      {isLoading && <Skeleton />}

      <motion.div
        className="space-y-2"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      >
        {board.map((entry) => (
          <motion.button
            key={entry.user_id}
            variants={{
              hidden: { opacity: 0, x: -16 },
              show: { opacity: 1, x: 0, transition: { ease: [0.23, 1, 0.32, 1], duration: 0.35 } },
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedId(entry.user_id)}
            className={clsx(
              "w-full flex items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-colors",
              entry.is_you
                ? "border-yellow-700/50 bg-yellow-900/10"
                : "border-gray-800 bg-gray-900 hover:border-gray-700"
            )}
          >
            {/* Rank */}
            <div className="w-8 text-center shrink-0">
              {RANK_MEDAL[entry.rank] ? (
                <span className="text-xl">{RANK_MEDAL[entry.rank]}</span>
              ) : (
                <span className="text-sm font-bold text-gray-500">#{entry.rank}</span>
              )}
            </div>

            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-base font-black text-gray-300 shrink-0 border border-gray-700">
              {entry.username[0].toUpperCase()}
            </div>

            {/* Name + title */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {entry.username}
                {entry.is_you && (
                  <span className="ml-1.5 text-xs text-yellow-400 font-normal">(you)</span>
                )}
              </p>
              <p className="text-xs mt-0.5 flex items-center gap-2">
                <span className={TITLE_COLOR[entry.title] ?? "text-gray-500"}>{entry.title}</span>
                <span className="text-gray-600">Lv {entry.level}</span>
                {entry.streak > 2 && (
                  <span className="text-orange-400">🔥 {entry.streak}d</span>
                )}
              </p>
            </div>

            {/* XP */}
            <div className="text-right shrink-0">
              <p className="font-bold text-sm text-yellow-400 tabular-nums">
                {entry.total_xp.toLocaleString()}
              </p>
              <p className="text-xs text-gray-600">XP</p>
            </div>

            <span className="text-gray-600 text-xs">›</span>
          </motion.button>
        ))}

        {!isLoading && board.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <p className="text-4xl mb-2">🏆</p>
            <p>No players yet.</p>
          </div>
        )}
      </motion.div>

      {/* Detail panel */}
      <AnimatePresence>
        {selectedId && (
          <UserDetailPanel
            userId={selectedId}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const ATTR_EMOJI = { creativity: "🎨", physicality: "💪", mentality: "🧠", social: "🤝" };

function UserDetailPanel({ userId, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard-user", userId],
    queryFn: () => api.get(`/leaderboard/user/${userId}`).then((r) => r.data),
  });
  const { data: activity } = useQuery({
    queryKey: ["leaderboard-activity", userId],
    queryFn: () => api.get(`/leaderboard/user/${userId}/activity?days=7`).then((r) => r.data),
  });

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20"
      />

      {/* Slide-up sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed inset-x-0 bottom-0 z-30 bg-gray-950 border-t border-gray-800 rounded-t-3xl max-h-[85vh] overflow-y-auto"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-700" />
        </div>

        {isLoading ? (
          <div className="p-6 animate-pulse space-y-4">
            <div className="h-16 bg-gray-800 rounded-2xl" />
            {[1,2,3,4].map((i) => <div key={i} className="h-14 bg-gray-800 rounded-xl" />)}
          </div>
        ) : data ? (
          <div className="p-5 pb-10 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-2xl font-black text-gray-300">
                {data.username[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-xl font-bold">
                  {data.username}
                  {data.is_you && <span className="ml-2 text-sm text-yellow-400 font-normal">(you)</span>}
                </p>
                <p className="text-sm flex items-center gap-2 mt-0.5">
                  <span className={TITLE_COLOR[data.title] ?? "text-gray-500"}>{data.title}</span>
                  <span className="text-gray-600">·</span>
                  <span className="text-gray-400">Level {data.level}</span>
                  <span className="text-gray-600">·</span>
                  <span className="text-gray-500">Rank #{data.rank}</span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-600 hover:text-gray-300 text-xl leading-none transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Total XP" value={data.total_xp.toLocaleString()} />
              <MiniStat label="Streak" value={`${data.streak.current}d`} />
              <MiniStat label="Best Streak" value={`${data.streak.longest}d`} />
            </div>

            {/* Attributes */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Attributes</p>
              <div className="space-y-3">
                {data.attributes.map((a, i) => {
                  const cfg = ATTR_CONFIG[a.attribute];
                  return (
                    <motion.div
                      key={a.attribute}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07, ease: [0.23, 1, 0.32, 1] }}
                      className="bg-gray-900 rounded-xl p-3 border border-gray-800"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium capitalize flex items-center gap-1.5">
                          {cfg.emoji} {a.attribute}
                        </span>
                        <span className="text-sm tabular-nums text-gray-400">
                          Lv <span className="font-bold text-white">{a.level}</span>
                          {" · "}{a.total_xp} XP
                        </span>
                      </div>
                      <div className={clsx("h-2 rounded-full overflow-hidden", cfg.track)}>
                        <motion.div
                          className={clsx("h-full rounded-full", cfg.bar)}
                          initial={{ width: 0 }}
                          animate={{ width: `${a.percent_to_next}%` }}
                          transition={{ duration: 0.8, delay: i * 0.07 + 0.1, ease: [0.23, 1, 0.32, 1] }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Recent activity */}
            {activity?.days?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Last 7 Days</p>
                <div className="space-y-3">
                  {activity.days.map((day) => (
                    <div key={day.date}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-gray-400">
                          {new Date(day.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        </span>
                        <span className="text-xs text-yellow-400 font-bold">+{day.total_xp} XP</span>
                      </div>
                      <div className="space-y-1">
                        {day.logs.map((log, i) => (
                          <div key={i} className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-2">
                            <span className="text-xs flex items-center gap-1.5">
                              <span>{ATTR_EMOJI[log.attribute]}</span>
                              {log.task_name}
                            </span>
                            <span className="text-xs text-yellow-400 font-semibold">+{log.xp_earned}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activity?.days?.length === 0 && (
              <p className="text-center text-gray-600 text-sm py-2">No activity in the last 7 days.</p>
            )}

            <p className="text-xs text-gray-700 text-center">Member since {data.member_since}</p>
          </div>
        ) : null}
      </motion.div>
    </>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
      <p className="font-bold text-lg tabular-nums">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {[1,2,3,4,5].map((i) => (
        <div key={i} className="h-16 bg-gray-800 rounded-2xl" />
      ))}
    </div>
  );
}
