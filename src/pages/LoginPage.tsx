import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import type { UserRole } from '../store/useAppStore';
import styles from './LoginPage.module.css';

const ResidentIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const StaffIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 7h-4V5l-2-2h-4L8 5v2H4c-1.1 0-2 .9-2 2v5c0 .75.4 1.38 1 1.73V19c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2v-3.28c.59-.35 1-.99 1-1.72V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5zM4 9h16v5h-5v-3H9v3H4V9zm9 6h-2v-2h2v2zm6 4H5v-3h4v1h6v-1h4v3z"/>
  </svg>
);

export default function LoginPage() {
  const setRole = useAppStore((s) => s.setRole);

  const handleSelect = (role: UserRole) => {
    setRole(role);
  };

  return (
    <div className={styles.loginPage}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className={styles.title}>Smart Service Agent</h1>
        </div>
        <p className={styles.subtitle}>AI-Powered Public Service Terminal — Select your role to begin</p>
      </motion.div>

      <div className={styles.roleCards}>
        {([
          {
            role: 'resident' as UserRole,
            icon: <ResidentIcon />,
            name: 'Resident',
            desc: 'Access public services, track applications',
          },
          {
            role: 'staff' as UserRole,
            icon: <StaffIcon />,
            name: 'Staff',
            desc: 'Manage cases, view dashboards',
          },
        ]).map((item, i) => (
          <motion.div
            key={item.role}
            className={styles.roleCard}
            onClick={() => handleSelect(item.role)}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 + i * 0.15, ease: 'easeOut' }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            <div className={styles.circleOverlay} />
            <div className={styles.roleIconWrap}>{item.icon}</div>
            <span className={styles.roleName}>{item.name}</span>
            <span className={styles.roleDesc}>{item.desc}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
