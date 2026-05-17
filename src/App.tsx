import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from './store/useAppStore';
import LoginPage from './pages/LoginPage';
import WorkspacePage from './pages/WorkspacePage';

export default function App() {
  const role = useAppStore((s) => s.role);

  return (
    <AnimatePresence mode="wait">
      {role === null ? (
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <LoginPage />
        </motion.div>
      ) : (
        <motion.div
          key="workspace"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <WorkspacePage />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
