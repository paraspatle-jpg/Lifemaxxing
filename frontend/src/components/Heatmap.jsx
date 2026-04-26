import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

const DAYS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getColor(xp) {
  if (!xp || xp === 0) return "bg-gray-800 border-gray-700/50";
  if (xp < 20) return "bg-indigo-900 border-indigo-800";
  if (xp < 50) return "bg-indigo-700 border-indigo-600";
  if (xp < 100) return "bg-violet-600 border-violet-500";
  return "bg-violet-400 border-violet-300";
}

function buildGrid(data) {
  const map = {};
  data.forEach((d) => { map[d.date] = d; });

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);
  // align to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const weeks = [];
  let week = [];
  const cursor = new Date(startDate);

  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    week.push({ date: key, ...(map[key] ?? { xp: 0, count: 0 }), future: cursor > today });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (week.length) weeks.push(week);
  return weeks;
}

function getMonthLabels(weeks) {
  const labels = [];
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    const d = new Date(week[0].date);
    const m = d.getMonth();
    if (m !== lastMonth) {
      labels.push({ index: i, label: MONTHS[m] });
      lastMonth = m;
    }
  });
  return labels;
}

export default function Heatmap({ data = [] }) {
  const [tooltip, setTooltip] = useState(null);
  const weeks = useMemo(() => buildGrid(data), [data]);
  const monthLabels = useMemo(() => getMonthLabels(weeks), [weeks]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-4 overflow-x-auto"
    >
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Activity Heatmap
      </h2>

      <div className="relative min-w-[600px]">
        {/* Month labels */}
        <div className="flex mb-1 ml-7">
          {weeks.map((_, i) => {
            const label = monthLabels.find((m) => m.index === i);
            return (
              <div key={i} className="flex-1 text-center">
                {label && <span className="text-xs text-gray-500">{label.label}</span>}
              </div>
            );
          })}
        </div>

        <div className="flex gap-0.5">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 mr-1 pt-0.5">
            {DAYS.map((d, i) => (
              <div key={i} className="h-3 text-right text-xs text-gray-600 leading-3 pr-1">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((cell, di) => (
                <motion.div
                  key={cell.date}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: cell.future ? 0 : 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: wi * 0.008 + di * 0.003 }}
                  whileHover={cell.xp > 0 ? { scale: 1.6, zIndex: 10 } : {}}
                  className={clsx(
                    "w-3 h-3 rounded-sm border cursor-default transition-colors",
                    cell.future ? "opacity-0" : getColor(cell.xp)
                  )}
                  onMouseEnter={() => setTooltip(cell)}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3 justify-end">
          <span className="text-xs text-gray-600">Less</span>
          {["bg-gray-800", "bg-indigo-900", "bg-indigo-700", "bg-violet-600", "bg-violet-400"].map((c) => (
            <div key={c} className={clsx("w-3 h-3 rounded-sm", c)} />
          ))}
          <span className="text-xs text-gray-600">More</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && tooltip.xp > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-xs text-gray-400 text-center"
        >
          <span className="text-white font-medium">{tooltip.date}</span>
          {" · "}
          <span className="text-yellow-400 font-semibold">+{tooltip.xp} XP</span>
          {" · "}
          {tooltip.count} task{tooltip.count !== 1 ? "s" : ""}
        </motion.div>
      )}
    </motion.div>
  );
}
