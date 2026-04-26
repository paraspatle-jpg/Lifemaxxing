import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/client";
import clsx from "clsx";

const ATTRS = ["physicality", "mentality", "creativity", "social"];
const ATTR_CONFIG = {
  creativity:  { emoji: "🎨", badge: "bg-purple-900 text-purple-300", border: "border-purple-800/40" },
  physicality: { emoji: "💪", badge: "bg-orange-900 text-orange-300", border: "border-orange-800/40" },
  mentality:   { emoji: "🧠", badge: "bg-blue-900 text-blue-300",     border: "border-blue-800/40"   },
  social:      { emoji: "🤝", badge: "bg-green-900 text-green-300",   border: "border-green-800/40"  },
};

const XP_MIN = 5, XP_MAX = 50, XP_STEP = 5;
const XP_OPTIONS = Array.from({ length: (XP_MAX - XP_MIN) / XP_STEP + 1 }, (_, i) => XP_MIN + i * XP_STEP);

function XpPicker({ value, onChange }) {
  return (
    <div>
      <label className="text-xs text-gray-400 block mb-2">
        XP Reward — <span className="text-yellow-400 font-bold">{value} XP</span>
      </label>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(XP_MIN, value - XP_STEP))} disabled={value <= XP_MIN}
          className="w-8 h-8 rounded-lg bg-gray-800 text-gray-300 font-bold disabled:opacity-30 hover:bg-gray-700 transition-colors">−</button>
        <div className="flex-1 relative h-2 bg-gray-800 rounded-full">
          <motion.div className="absolute h-full bg-yellow-500 rounded-full"
            animate={{ width: `${((value - XP_MIN) / (XP_MAX - XP_MIN)) * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }} />
          <input type="range" min={XP_MIN} max={XP_MAX} step={XP_STEP} value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
        </div>
        <button type="button" onClick={() => onChange(Math.min(XP_MAX, value + XP_STEP))} disabled={value >= XP_MAX}
          className="w-8 h-8 rounded-lg bg-gray-800 text-gray-300 font-bold disabled:opacity-30 hover:bg-gray-700 transition-colors">+</button>
      </div>
      <div className="flex justify-between mt-1 px-5">
        {XP_OPTIONS.filter((_, i) => i % 2 === 0).map((v) => (
          <span key={v} className="text-xs text-gray-700">{v}</span>
        ))}
      </div>
    </div>
  );
}

function TaskForm({ initial, onSubmit, onCancel, isPending, error, submitLabel }) {
  const [form, setForm] = useState(initial);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <input required placeholder="Task name" value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="w-full bg-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 ring-gray-500" />
      <input placeholder="Description (optional)" value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full bg-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 ring-gray-500" />
      <div>
        <label className="text-xs text-gray-400 block mb-2">Attribute</label>
        <div className="grid grid-cols-2 gap-2">
          {ATTRS.map((a) => (
            <button key={a} type="button" onClick={() => setForm({ ...form, attribute: a })}
              className={clsx("flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all",
                form.attribute === a ? "border-white bg-white/10 text-white" : "border-gray-700 text-gray-500 hover:border-gray-600")}>
              <span>{ATTR_CONFIG[a].emoji}</span>
              <span className="capitalize">{a}</span>
            </button>
          ))}
        </div>
      </div>
      <XpPicker value={form.xp_reward} onChange={(v) => setForm({ ...form, xp_reward: v })} />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 bg-gray-800 text-gray-300 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-700 transition-colors">
          Cancel
        </button>
        <motion.button type="submit" disabled={isPending} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="flex-1 bg-white text-gray-950 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-100 transition-colors disabled:opacity-60">
          {isPending ? "Saving…" : submitLabel}
        </motion.button>
      </div>
    </form>
  );
}

export default function Tasks() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeAttr = searchParams.get("attribute");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post("/tasks", data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); setShowCreate(false); setCreateError(""); },
    onError: (err) => setCreateError(err.response?.data?.detail ?? "Failed to create task"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/tasks/${id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); setEditingId(null); setEditError(""); },
    onError: (err) => setEditError(err.response?.data?.detail ?? "Failed to update task"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const visibleAttrs = activeAttr && ATTRS.includes(activeAttr) ? [activeAttr] : ATTRS;
  const grouped = ATTRS.reduce((acc, a) => { acc[a] = tasks.filter((t) => t.attribute === a); return acc; }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold capitalize">{activeAttr ? `${ATTR_CONFIG[activeAttr].emoji} ${activeAttr} Tasks` : "Tasks"}</h1>
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => { setShowCreate(!showCreate); setCreateError(""); setEditingId(null); }}
          className="bg-white text-gray-950 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
          {showCreate ? "Cancel" : "+ New Task"}
        </motion.button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ ease: [0.23, 1, 0.32, 1], duration: 0.3 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <h2 className="font-semibold mb-4">Create Task</h2>
            <TaskForm
              initial={{ name: "", description: "", attribute: "physicality", xp_reward: 10 }}
              onSubmit={(form) => createMutation.mutate(form)}
              onCancel={() => { setShowCreate(false); setCreateError(""); }}
              isPending={createMutation.isPending}
              error={createError}
              submitLabel="Create Task"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grouped task lists */}
      {visibleAttrs.map((attr) => (
        <div key={attr}>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            {ATTR_CONFIG[attr].emoji} {attr}
            <span className="text-gray-700 font-normal normal-case tracking-normal">({grouped[attr].length})</span>
          </h2>

          {grouped[attr].length === 0 && <p className="text-gray-700 text-sm pl-6">No tasks yet.</p>}

          <div className="space-y-2">
            <AnimatePresence>
              {grouped[attr].map((task) => (
                <motion.div key={task.id} layout
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                  transition={{ ease: [0.23, 1, 0.32, 1], duration: 0.3 }}
                  className={clsx("bg-gray-900 rounded-xl border overflow-hidden", ATTR_CONFIG[attr].border)}>

                  {/* Task row */}
                  {editingId !== task.id && (
                    <div className="flex items-center px-4 py-3 gap-3 cursor-pointer"
                      onClick={() => navigate(`/log?task=${task.id}`)}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.name}</p>
                        {task.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>}
                        <span className={clsx("text-xs px-2 py-0.5 rounded-full mt-1.5 inline-block font-semibold", ATTR_CONFIG[attr].badge)}>
                          +{task.xp_reward} XP
                        </span>
                      </div>
                      {task.is_default ? (
                        <span className="text-xs text-gray-700 shrink-0 ml-2">default</span>
                      ) : (
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { setEditingId(task.id); setEditError(""); setShowCreate(false); }}
                            className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
                            title="Edit">✏️</button>
                          <button onClick={() => deleteMutation.mutate(task.id)}
                            disabled={deleteMutation.isPending}
                            className="p-2 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-gray-800"
                            title="Delete">🗑️</button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inline edit form */}
                  <AnimatePresence>
                    {editingId === task.id && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="p-4 border-t border-gray-800">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Edit Task</p>
                        <TaskForm
                          initial={{ name: task.name, description: task.description ?? "", attribute: task.attribute, xp_reward: task.xp_reward }}
                          onSubmit={(form) => updateMutation.mutate({ id: task.id, data: form })}
                          onCancel={() => { setEditingId(null); setEditError(""); }}
                          isPending={updateMutation.isPending}
                          error={editError}
                          submitLabel="Save Changes"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}
