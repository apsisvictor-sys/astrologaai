'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/i18n/navigation';

interface UpgradeModalProps {
  isOpen: boolean;
  feature: string;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, feature, onClose }: UpgradeModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full glass-panel glow-primary p-8 rounded-t-3xl md:rounded-3xl z-50"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-text-muted hover:text-white text-2xl leading-none"
            >
              ×
            </button>
            <p className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-2">Upgrade Required</p>
            <h2 className="text-2xl font-bold text-white mb-2">{feature}</h2>
            <p className="text-text-secondary text-sm mb-6">
              This feature is available on The Navigator (PRO) plan and above.
            </p>
            <Link
              href="/pricing"
              onClick={onClose}
              className="block w-full text-center gradient-button text-white font-bold py-3.5 rounded-full"
            >
              View Plans & Upgrade
            </Link>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
