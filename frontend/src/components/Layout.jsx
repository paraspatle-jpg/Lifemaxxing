import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import clsx from "clsx";

const navItems = [
  { to: "/", label: "Dashboard", icon: "⚡" },
  { to: "/log", label: "Log", icon: "✅" },
  { to: "/tasks", label: "Tasks", icon: "📋" },
  { to: "/leaderboard", label: "Ranks", icon: "🏆" },
  { to: "/stats", label: "Stats", icon: "📊" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <motion.span
            className="font-black text-lg tracking-tight"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            LifeMaxxing
          </motion.span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-600 hover:text-gray-300 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="border-t border-gray-800 bg-gray-950/90 backdrop-blur sticky bottom-0 z-10 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-4xl mx-auto flex">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex-1 flex flex-col items-center gap-0.5 py-3 text-xs transition-colors relative",
                  isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute top-0 inset-x-0 mx-auto w-6 h-0.5 bg-white rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="text-lg leading-none">{icon}</span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
