/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { Rocket, ShieldAlert, Award, ArrowRight, Sparkles, HelpCircle } from 'lucide-react';

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
    <div className="flex flex-col min-h-full flex-1 w-full p-6 text-white bg-brand-dark relative justify-between pb-8 overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-20%] w-[300px] h-[300px] rounded-full bg-brand-purple-light opacity-20 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[300px] h-[300px] rounded-full bg-brand-orange opacity-20 blur-[80px] pointer-events-none" />

      {/* Header Info */}
      <div className="flex items-center justify-between pt-4 z-10">
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F27D26]/10 border border-[#F27D26]/30 rounded-full text-xs font-bold font-mono text-brand-orange uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
          Expo PP
        </div>
        <div className="flex items-center gap-2">
          <button 
            id="btn-how-it-works-header"
            onClick={() => navigate('gamificacao')}
            className="text-xs font-mono text-slate-300 hover:text-white transition px-3 py-1.5 hover:bg-white/5 rounded-lg border border-brand-border/40 hover:border-brand-border cursor-pointer flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-brand-orange" />
            <span>Como Funciona</span>
          </button>
          <button 
            id="btn-admin-panel"
            onClick={() => navigate('admin')}
            className="text-xs font-mono text-slate-400 hover:text-white transition px-2.5 py-1.5 hover:bg-white/5 rounded-lg border border-brand-border/30 hover:border-brand-border cursor-pointer"
          >
            Admin
          </button>
        </div>
      </div>

      {/* Hero Body */}
      <div className="flex flex-col items-center justify-center text-center my-auto py-6 space-y-5 z-10">
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

        <div className="space-y-2">
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="font-display text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-brand-orange"
          >
            EXPO PP
          </motion.h1>
          
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-sm text-white/80 max-w-md mx-auto leading-relaxed"
          >
            Transformando a produção acadêmica em experiência de mercado através de economia digital.
          </motion.p>
        </div>

        {/* Dedicated Link Banner to Gamification Step-by-Step */}
        <motion.button
          id="btn-view-gamification-guide"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => navigate('gamificacao')}
          className="w-full max-w-md p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-brand-surface to-orange-950/30 border border-brand-border hover:border-brand-orange/60 transition-all flex items-center justify-between group cursor-pointer text-left shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#F27D26]/20 to-purple-600/30 text-brand-orange border border-brand-orange/20 group-hover:scale-105 transition-transform shrink-0">
              <Sparkles className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-brand-orange tracking-wider uppercase block">
                Guia do Participante
              </span>
              <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-brand-orange transition-colors">
                Como funciona a gamificação? Veja o passo a passo
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-orange group-hover:translate-x-1 transition-all shrink-0 ml-2" />
        </motion.button>

        {/* Feature Highlights */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-md bg-brand-surface/40 border border-brand-border rounded-2xl p-5 text-left space-y-4 font-sans backdrop-blur-xs"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-brand-purple/30 text-[#7C3AED] border border-brand-purple-light/20 mt-0.5 shrink-0">
              <Award className="w-5 h-5 text-[#F27D26]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Créditos de Investimento</h3>
              <p className="text-xs text-white/60">Receba 1.000 créditos para apoiar as agências estudantis do evento.</p>
            </div>
          </div>
          <div className="flex items-start gap-3.5 border-t border-brand-border pt-3.5">
            <div className="p-2 rounded-xl bg-brand-orange/10 text-brand-orange border border-brand-orange/20 mt-0.5 shrink-0">
              <ShieldAlert className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Apoie Ideias Ativamente</h3>
              <p className="text-xs text-white/60">Assista aos pitches, escaneie os códigos QR nos stands e invista.</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Actions */}
      <div className="pb-1 mt-2 flex flex-col items-center z-10 w-full">
        <motion.button
          id="btn-start-experience"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          className="w-full max-w-xs py-3.5 px-6 bg-brand-orange hover:bg-brand-orange-hover text-white font-display font-bold text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-brand-orange/20 cursor-pointer group transition-all duration-300"
        >
          <span>{state.currentVisitor ? 'Acessar Carteira' : 'Investir Agora'}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </motion.button>

        <button
          onClick={() => navigate('gamificacao')}
          className="mt-2.5 text-xs font-sans text-slate-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-brand-orange" />
          <span>Dúvidas? Veja as regras e passo a passo</span>
        </button>
      </div>
    </div>
  );
};
