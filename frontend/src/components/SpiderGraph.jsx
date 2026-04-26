import { motion } from "framer-motion";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from "recharts";

const ATTR_LABELS = {
  creativity: "🎨 Creativity",
  physicality: "💪 Physicality",
  mentality: "🧠 Mentality",
  social: "🤝 Social",
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm shadow-xl">
      <p className="font-semibold">{ATTR_LABELS[d.attribute] ?? d.attribute}</p>
      <p className="text-yellow-400">Level {d.level} · {d.total_xp} XP</p>
      <p className="text-gray-500 text-xs">{d.value}% of top attribute</p>
    </div>
  );
};

const CustomDot = (props) => {
  const { cx, cy } = props;
  return (
    <motion.circle
      cx={cx} cy={cy} r={5}
      fill="#a78bfa"
      stroke="#7c3aed"
      strokeWidth={2}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
    />
  );
};

export default function SpiderGraph({ attributes }) {
  if (!attributes?.length) return null;

  const maxXP = Math.max(...attributes.map((a) => a.total_xp), 1);

  const data = attributes.map((a) => ({
    attribute: a.attribute,
    subject: ATTR_LABELS[a.attribute] ?? a.attribute,
    level: a.level,
    total_xp: a.total_xp,
    value: Math.round((a.total_xp / maxXP) * 100),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-4"
    >
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Attribute Radar
      </h2>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data} outerRadius={90}>
          <PolarGrid
            stroke="#374151"
            strokeDasharray="3 3"
            gridType="polygon"
          />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#9ca3af", fontSize: 12, fontWeight: 500 }}
          />
          <Radar
            name="Level"
            dataKey="value"
            stroke="#a78bfa"
            fill="#7c3aed"
            fillOpacity={0.25}
            strokeWidth={2}
            dot={<CustomDot />}
            animationBegin={200}
            animationDuration={1000}
            animationEasing="ease-out"
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
