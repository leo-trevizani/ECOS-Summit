/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { openNpsForm, markNpsAsInteracted } from '../utils/nps';
import { MessageSquareHeart, ExternalLink, X, Sparkles } from 'lucide-react';

interface NpsBottomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export const NpsBottomDrawer: React.FC<NpsBottomDrawerProps> = ({
  isOpen,
  onClose,
  title = 'O que está achando da Expo PP?',
  subtitle = 'Diga para a gente a sua opinião sobre o evento. Leva menos de 1 minuto e nos ajuda muito a melhorar!'
}) => {
  const handleOpenForm = () => {
    openNpsForm();
    onClose();
  };

  const handleDismiss = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
          {/* Backdrop Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs pointer-events-auto"
          />

          {/* Bottom Sheet Drawer */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full max-w-lg bg-brand-surface border-t border-brand-border rounded-t-3xl p-5 pb-7 sm:p-6 sm:pb-8 shadow-2xl relative z-10 pointer-events-auto text-white overflow-hidden"
          >
            {/* Top Drag Handle Bar */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" />

            {/* Close Icon Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with Icon */}
            <div className="flex items-start gap-3.5 mb-4 pr-8">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-brand-orange to-brand-purple text-white shadow-lg shadow-brand-orange/20 shrink-0">
                <MessageSquareHeart className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-brand-orange">
                  <Sparkles className="w-3 h-3" />
                  Pesquisa Rápida • NPS
                </div>
                <h3 className="text-base sm:text-lg font-display font-bold text-white leading-tight">
                  {title}
                </h3>
              </div>
            </div>

            {/* Description Body */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans mb-5">
              {subtitle}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                id="btn-nps-open-form"
                onClick={handleOpenForm}
                className="w-full py-3.5 px-5 bg-brand-orange hover:bg-brand-orange-hover text-white font-display font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/20 cursor-pointer transition active:scale-[0.99]"
              >
                <span>Responder Pesquisa (1 min)</span>
                <ExternalLink className="w-4 h-4" />
              </button>

              <button
                type="button"
                id="btn-nps-dismiss"
                onClick={handleDismiss}
                className="w-full sm:w-auto py-3 px-4 bg-brand-dark hover:bg-white/10 text-slate-400 hover:text-white font-mono text-xs rounded-xl border border-brand-border/60 transition cursor-pointer text-center"
              >
                Mais tarde
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
