/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { Rocket, ShieldAlert, Award, ArrowRight } from 'lucide-react';

export const WelcomeScreen: React.FC = () => {
  const { state, navigate } = useApp();

  const handleStart = () => {
    if (state.currentVisitor) {
      navigate('wallet');
    } else {
      navigate('onboarding');
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full p-6 text-white bg-brand-dark relative justify-between pb-8">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-20%] w-[300px] h-[300px] rounded-full bg-brand-purple-light opacity-20 blur-[80px]" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[300px] h-[300px] rounded-full bg-brand-orange opacity-20 blur-[80px]" />

      {/* Header Info */}
      <div className="flex items-center justify-between pt-4 z-10">
        <div className="flex items-center gap-1.5 px-3.5 py-1 bg-[#F27D26]/10 border border-[#F27D26]/30 rounded-full text-[10px] font-bold font-mono text-brand-orange uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
          ECOS Summit
        </div>
        <button 
          id="btn-admin-panel"
          onClick={() => navigate('admin')}
          className="text-xs font-mono text-slate-400 hover:text-white transition px-2.5 py-1 hover:bg-white/5 rounded-md border border-transparent hover:border-brand-border cursor-pointer"
        >
          Console Admin
        </button>
      </div>

      {/* Hero Body */}
      <div className="flex flex-col items-center justify-center text-center my-auto py-8 space-y-6 z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, type: "spring" }}
          className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#F27D26] to-[#7C3AED] shadow-xl shadow-brand-orange/10"
        >
          <Rocket className="w-12 h-12 text-white stroke-[1.5]" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand-orange border-2 border-brand-dark flex items-center justify-center">
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping absolute" />
            <span className="w-2 h-2 bg-white rounded-full" />
          </div>
        </motion.div>

        <div className="space-y-3">
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="font-display text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-brand-orange"
          >
            ECOS SUMMIT
          </motion.h1>
          
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-sm text-white/70 max-w-md mx-auto leading-relaxed"
          >
            Transformando a produção acadêmica em experiência de mercado através de economia digital.
          </motion.p>
        </div>

        {/* Feature Highlights */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-md bg-brand-surface/40 border border-brand-border rounded-2xl p-6 text-left space-y-4 font-sans backdrop-blur-xs"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-xl bg-brand-purple/30 text-[#7C3AED] border border-brand-purple-light/20 mt-0.5">
              <Award className="w-5 h-5 text-[#F27D26]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">Créditos de Investimento</h3>
              <p className="text-xs text-white/50">Receba 1.000 ECOS para apoiar as agências estudantis do evento.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 border-t border-brand-border pt-4">
            <div className="p-2 rounded-xl bg-brand-orange/10 text-brand-orange border border-brand-orange/20 mt-0.5">
              <ShieldAlert className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">Apoie Ideias Ativamente</h3>
              <p className="text-xs text-white/50">Assista aos pitches, escaneie os códigos QR e invista em tempo real.</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Actions with balanced padding and closer spacing */}
      <div className="pb-1 mt-3 flex flex-col items-center z-10 w-full">
        <motion.button
          id="btn-start-experience"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          className="w-full max-w-xs py-4 px-6 bg-brand-orange hover:bg-brand-orange-hover text-white font-display font-bold text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-brand-orange/20 cursor-pointer group transition-all duration-300"
        >
          <span>Investir Agora</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </div>
    </div>
  );
};
