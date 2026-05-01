import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

const isSupported = () => Capacitor.isNativePlatform();

// Stable 31-bit int from a Mongo ObjectId-ish string (must fit signed int32 on Android)
export function notifIdForTask(taskId) {
  let h = 0;
  for (let i = 0; i < taskId.length; i++) {
    h = ((h << 5) - h + taskId.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 2147483647;
}

export async function ensurePermission() {
  if (!isSupported()) return false;
  const { display } = await LocalNotifications.checkPermissions();
  if (display === "granted") return true;
  const res = await LocalNotifications.requestPermissions();
  return res.display === "granted";
}

function bodyFor(task) {
  return (
    task.reminder?.message?.trim() ||
    task.reminder_message?.trim() ||
    `Reminder: ${task.name}`
  );
}

// Build the schedule object the plugin expects from { time: "HH:MM", repeat }.
function buildSchedule(reminder) {
  if (!reminder?.enabled || !reminder.time) return null;
  const [h, m] = reminder.time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;

  if (reminder.repeat === "daily") {
    return { on: { hour: h, minute: m }, allowWhileIdle: true };
  }
  // one-shot: next occurrence of HH:MM (today if still in the future, else tomorrow)
  const at = new Date();
  at.setHours(h, m, 0, 0);
  if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
  return { at, allowWhileIdle: true };
}

export async function scheduleForTask(task) {
  if (!isSupported()) return;
  const schedule = buildSchedule(task.reminder);
  const id = notifIdForTask(task.id);
  await LocalNotifications.cancel({ notifications: [{ id }] }).catch(() => {});
  if (!schedule) return;
  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title: task.name,
        body: bodyFor(task),
        schedule,
        extra: { taskId: task.id },
      },
    ],
  });
}

export async function cancelForTask(taskId) {
  if (!isSupported()) return;
  await LocalNotifications.cancel({
    notifications: [{ id: notifIdForTask(taskId) }],
  }).catch(() => {});
}

// Cancel everything pending and reschedule from the given task list.
export async function reconcileAll(tasks) {
  if (!isSupported()) return;
  const pending = await LocalNotifications.getPending().catch(() => ({ notifications: [] }));
  if (pending.notifications?.length) {
    await LocalNotifications.cancel({
      notifications: pending.notifications.map((n) => ({ id: n.id })),
    }).catch(() => {});
  }
  for (const t of tasks) {
    if (t.is_active && t.reminder?.enabled) {
      await scheduleForTask(t);
    }
  }
}
