/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCPF } from '../utils/cpf';
import { motion } from 'motion/react';
import { ArrowLeft, User, CreditCard, ShieldAlert, Sparkles } from 'lucide-react';

export const OnboardingScreen: React.FC = () => {
  const { registerVisitor, loginVisitor, navigate } = useApp();
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-format CPF during input
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const rawVal = e.target.value;
    setCpf(formatCPF(rawVal));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLogin && !name.trim()) {
      setError('Por favor, informe seu nome completo.');
      return;
    }

    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setError('Por favor, informe um CPF completo contendo 11 dígitos.');
      return;
    }

    setIsLoading(true);

    // Run action after a brief visual loading state for high-end fintech feel
    setTimeout(async () => {
      try {
        let result;
        if (isLogin) {
          result = await loginVisitor(cpf);
        } else {
          result = await registerVisitor(name, cpf);
        }
        setIsLoading(false);
        
        if (!result.success && result.error) {
          setError(result.error);
        }
      } catch (err: any) {
        setIsLoading(false);
        setError('Ocorreu um erro ao processar. Tente novamente.');
      }
    }, 600);
  };

  return (
    <div className="flex flex-col min-h-full flex-1 w-full p-6 text-white bg-brand-dark relative pb-8">
      {/* Decorative Blur */}
      <div className="absolute top-[-20%] right-[-25%] w-[350px] h-[350px] rounded-full bg-brand-purple-light opacity-15 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-20%] w-[300px] h-[300px] rounded-full bg-brand-orange opacity-10 blur-[80px] pointer-events-none" />

      {/* Header Navigation */}
      <div className="flex items-center gap-3 mb-8 z-10 pt-2">
        <button
          id="btn-back-to-welcome"
          onClick={() => navigate('welcome')}
          className="p-2.5 rounded-full bg-brand-surface border border-brand-border text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xs font-mono text-slate-400 uppercase tracking-widest">
            {isLogin ? 'ACESSO À CARTEIRA' : 'PASSO 1 DE 2'}
          </h2>
          <h1 className="text-xl font-display font-bold tracking-tight text-slate-100">
            {isLogin ? 'Entrar com CPF' : 'Cadastro de Visitante'}
          </h1>
        </div>
      </div>

      {/* Hero Welcome Info */}
      <div className="mb-6 z-10 text-center bg-gradient-to-br from-brand-purple/20 to-transparent border border-brand-border rounded-2xl p-5 relative">
        <div className="absolute top-2.5 right-2.5 text-brand-orange/40 animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
        <p className="text-sm text-white/80 leading-relaxed">
          {isLogin ? (
            <span>Informe seu CPF abaixo para acessar seu saldo e histórico de transações da carteira digital.</span>
          ) : (
            <span>
              Para garantir a integridade do ranking das agências acadêmicas, cada visitante deve registrar seu CPF. É rápido, seguro, e garante seu crédito inicial de{' '}
              <strong className="text-brand-orange font-bold font-mono text-base">1.000 créditos</strong>.
            </span>
          )}
        </p>
      </div>

      {/* Form Card */}
      <div className="z-10 my-auto bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Field (Register Only) */}
          {!isLogin && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-2 overflow-hidden"
            >
              <label className="block text-xs font-bold text-white/60 font-mono tracking-widest">
                NOME COMPLETO
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-white/40">
                  <User className="w-5 h-5" />
                </span>
                <input
                  id="input-name"
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={name}
                  onChange={(e) => {
                    setError(null);
                    setName(e.target.value);
                  }}
                  className="w-full pl-11 pr-4 py-3.5 bg-brand-dark border border-brand-border rounded-xl text-base text-white placeholder-white/20 focus:outline-none focus:border-brand-purple-light focus:ring-1 focus:ring-brand-purple-light transition-all"
                  disabled={isLoading}
                  required={!isLogin}
                />
              </div>
            </motion.div>
          )}

          {/* CPF Field */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-white/60 font-mono tracking-widest">
              CPF
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-white/40">
                <CreditCard className="w-5 h-5" />
              </span>
              <input
                id="input-cpf"
                type="text"
                inputMode="numeric"
                maxLength={14}
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCpfChange}
                className="w-full pl-11 pr-4 py-3.5 bg-brand-dark border border-brand-border rounded-xl font-mono text-base text-white placeholder-white/20 focus:outline-none focus:border-brand-purple-light focus:ring-1 focus:ring-brand-purple-light transition-all"
                disabled={isLoading}
                required
              />
            </div>
            <p className="text-xs text-white/40 font-mono">
              Seu CPF será validado matematicamente. Alunos expositores não podem ser cadastrados.
            </p>
          </div>

          {/* Error Message Box */}
          {error && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 text-red-200"
            >
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p id="onboarding-error-msg" className="text-xs font-sans leading-relaxed">
                {error}
              </p>
            </motion.div>
          )}

          {/* Submit Button */}
          <button
            id="btn-submit-onboarding"
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-brand-orange hover:bg-brand-orange-hover text-white font-display font-bold text-base uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-orange/20 disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{isLogin ? 'Buscando Carteira...' : 'Validando CPF...'}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>{isLogin ? 'Entrar' : 'Cadastrar'}</span>
                {!isLogin && (
                  <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-white/20 rounded-full">
                    +1k créditos
                  </span>
                )}
              </div>
            )}
          </button>
        </form>

        {/* Toggle between Register and Login */}
        <div className="mt-5 text-center">
          <button
            id="btn-toggle-onboarding-mode"
            type="button"
            onClick={() => {
              setError(null);
              setIsLogin(!isLogin);
            }}
            className="text-sm text-brand-purple-light hover:text-[#9F7AEA] font-medium transition cursor-pointer"
          >
            {isLogin ? 'Não possui cadastro? Criar Conta' : 'Já possui cadastro? Entrar com CPF'}
          </button>
        </div>
      </div>

      {/* Security note */}
      <p className="text-center text-xs text-white/30 mt-auto pt-4 font-sans">
        Protegido por criptografia. Seus dados de CPF são de uso restrito ao ECOS Summit para assegurar as regras do evento acadêmico.
      </p>
    </div>
  );
};
