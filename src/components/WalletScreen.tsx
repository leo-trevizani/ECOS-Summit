/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatCPF } from '../utils/cpf';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  QrCode, 
  ArrowUpRight, 
  LogOut, 
  CheckCircle, 
  X, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Building2,
  Lock,
  Volume2,
  VolumeX
} from 'lucide-react';
import { QrScannerComponent } from './QrScannerComponent';

// Synthesized audio helper using Web Audio API to prevent static file assets loading issues
const playSound = (type: 'click' | 'success', enabled: boolean) => {
  if (!enabled) return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (type === 'click') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } else if (type === 'success') {
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        
        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
        
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = audioCtx.currentTime;
      playTone(523.25, now, 0.25);
      playTone(659.25, now + 0.08, 0.25);
      playTone(783.99, now + 0.16, 0.25);
      playTone(1046.50, now + 0.24, 0.4);
    }
  } catch (err) {
    console.warn('Web Audio synthesis failed or is blocked by browser interaction permissions:', err);
  }
};

// Custom lightweight React+Motion confetti simulation
const Confetti: React.FC = () => {
  const [pieces, setPieces] = useState<{ id: number; x: number; size: number; color: string; delay: number; duration: number; angle: number }[]>([]);

  useEffect(() => {
    const colors = ['#F27D26', '#7C3AED', '#FFD700', '#FF2E93', '#00F0FF', '#39FF14'];
    const newPieces = Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // random percentage horizontal
      size: Math.random() * 8 + 6, // 6px to 14px
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
      duration: Math.random() * 2.0 + 1.8,
      angle: Math.random() * 360,
    }));
    setPieces(newPieces);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-40">
      {pieces.map(p => (
        <motion.div
          key={p.id}
          initial={{ 
            opacity: 1, 
            x: `${p.x}vw`, 
            y: '105vh', 
            rotate: p.angle 
          }}
          animate={{ 
            y: '-10vh', 
            rotate: p.angle + 360 * (Math.random() > 0.5 ? 1 : -1) 
          }}
          transition={{ 
            delay: p.delay, 
            duration: p.duration, 
            ease: 'easeOut' 
          }}
          className="absolute rounded-sm"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  );
};

export const WalletScreen: React.FC = () => {
  const { state, currentPath, currentParam, navigate, investInAgency, logout } = useApp();
  const visitor = state.currentVisitor;

  // Modal / Simulation states
  const [showScanner, setShowScanner] = useState(false);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [investAmount, setInvestAmount] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSuccessTx, setLastSuccessTx] = useState<{ agencyName: string; amount: number } | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(() => {
    const cached = localStorage.getItem('ecos_sound_enabled');
    return cached !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('ecos_sound_enabled', String(soundEnabled));
  }, [soundEnabled]);

  // Deep Link handler: If route is /investir/[id], auto-open investment flow for that agency
  useEffect(() => {
    if (currentPath === 'investir' && currentParam) {
      // Check if visitor is logged in. If not, Onboarding handles redirect, but just in case
      if (!visitor) {
        navigate('onboarding');
        return;
      }
      const agencyExists = state.agencies.some(a => a.id === currentParam);
      if (agencyExists) {
        setSelectedAgencyId(currentParam);
        setShowScanner(false);
      } else {
        setErrorMsg('Agência inválida ou não encontrada via link.');
      }
    }
  }, [currentPath, currentParam, visitor, state.agencies]);

  // If there's no logged-in visitor, redirect to onboarding or welcome
  if (!visitor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-white bg-slate-950 text-center space-y-4">
        <Lock className="w-12 h-12 text-brand-orange animate-bounce" />
        <h2 className="text-lg font-display font-semibold">Sessão Expirada ou Não Iniciada</h2>
        <p className="text-xs text-slate-400 max-w-xs">
          Para ver sua carteira digital ou realizar investimentos, por favor cadastre-se no onboarding.
        </p>
        <button
          onClick={() => navigate('onboarding')}
          className="px-6 py-2.5 bg-brand-purple-light rounded-xl font-semibold text-sm hover:bg-brand-purple transition"
        >
          Ir para Cadastro
        </button>
      </div>
    );
  }

  const selectedAgency = state.agencies.find(a => a.id === selectedAgencyId);

  const handleScanSuccess = (decodedText: string) => {
    // Process URL formats:
    // https://dominio.com/investir/[ID-DA-AGENCIA]
    // http://dominio.com/investir/[ID-DA-AGENCIA]
    // #/investir/[ID-DA-AGENCIA]
    // plain text: [ID-DA-AGENCIA]
    let targetId = decodedText.trim();

    if (targetId.includes('/investir/')) {
      const parts = targetId.split('/investir/');
      if (parts.length > 1) {
        targetId = parts[1].split(/[?#]/)[0];
      }
    } else if (targetId.includes('#/investir/')) {
      const parts = targetId.split('#/investir/');
      if (parts.length > 1) {
        targetId = parts[1].split(/[?#]/)[0];
      }
    } else if (targetId.startsWith('http://') || targetId.startsWith('https://')) {
      const parts = targetId.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        targetId = lastPart.split(/[?#]/)[0];
      }
    }

    const cleanId = targetId.toLowerCase().trim();
    const matchedAgency = state.agencies.find(a => a.id === cleanId);

    if (matchedAgency) {
      setSelectedAgencyId(matchedAgency.id);
      setShowScanner(false);
      setErrorMsg(null);
      setInvestAmount('');
    } else {
      setErrorMsg(`Código QR lido é inválido ou agência não cadastrada: "${cleanId}"`);
    }
  };

  const handleScanSimulation = (agencyId: string) => {
    handleScanSuccess(agencyId);
  };

  const handleManualCodeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const code = (data.get('agencyCode') as string || '').toLowerCase().trim();
    
    const agency = state.agencies.find(a => a.id === code);
    if (agency) {
      handleScanSuccess(agency.id);
    } else {
      setErrorMsg('Código de agência inválido. Tente "vortex", "lumina", "apex" ou "spark".');
    }
  };

  const [isInvesting, setIsInvesting] = useState(false);

  const handleInvestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amount = parseInt(investAmount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Por favor, informe uma quantia inteira e maior que zero.');
      return;
    }

    if (!selectedAgencyId) {
      setErrorMsg('Agência não identificada.');
      return;
    }

    setIsInvesting(true);
    try {
      const result = await investInAgency(selectedAgencyId, amount);
      setIsInvesting(false);
      if (result.success) {
        setLastSuccessTx({
          agencyName: selectedAgency?.name || 'Agência',
          amount: amount
        });
        setShowSuccess(true);
        setSelectedAgencyId(null);
        setInvestAmount('');
        playSound('success', soundEnabled);
        
        // Clear URL query / hash after investment to go back to standard /wallet
        navigate('wallet');
      } else if (result.error) {
        setErrorMsg(result.error);
      }
    } catch (err) {
      setIsInvesting(false);
      setErrorMsg('Erro inesperado ao realizar transação.');
    }
  };

  // Filter transactions of this specific visitor
  const myTransactions = state.transactions.filter(tx => tx.visitorCpf === visitor.cpf);

  return (
    <div className="flex flex-col min-h-screen bg-brand-dark text-white relative pb-8">
      {/* Glow Rings */}
      <div className="absolute top-[-25%] left-[-20%] w-[350px] h-[350px] rounded-full bg-brand-purple-light opacity-20 blur-[100px]" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[300px] h-[300px] rounded-full bg-brand-orange opacity-10 blur-[80px]" />

      {/* Main Container / Scrollable */}
      <div className="flex flex-col w-full pb-6">
        
        {/* Header App Bar */}
        <div className="flex items-center justify-between p-6 pb-2 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#F27D26] to-[#7C3AED] flex items-center justify-center">
              <span className="font-display font-bold text-sm text-white">E</span>
            </div>
            <div>
              <h2 className="text-[10px] font-mono text-white/40 leading-none">ECOS WALLET</h2>
              <h1 className="text-sm font-sans font-bold text-slate-200">Olá, {visitor.name.split(' ')[0]}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              id="btn-toggle-sound"
              onClick={() => {
                const newVal = !soundEnabled;
                setSoundEnabled(newVal);
                playSound('click', newVal);
              }}
              className="p-2 bg-brand-surface border border-brand-border rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              title={soundEnabled ? 'Silenciar Sons' : 'Ativar Sons'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-brand-orange" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>
            <button 
              id="btn-logout"
              onClick={logout} 
              className="p-2 bg-brand-surface border border-brand-border rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              title="Sair da Conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Balance Wallet Card */}
        <div className="px-6 py-2 shrink-0 z-10">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative overflow-hidden bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-xl"
          >
            <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-[#7C3AED]/10 rounded-full blur-2xl" />
            
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold tracking-wider text-white/50 flex items-center gap-1.5 font-mono">
                  <Wallet className="w-3.5 h-3.5 text-brand-orange" />
                  SALDO DISPONÍVEL
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span id="label-balance-ecos" className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200">
                    {visitor.balance.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-xs font-mono font-bold text-brand-orange">ECOS</span>
                </div>
              </div>
              
              <div className="text-right">
                <span className="text-[9px] font-bold text-white/40 block font-mono uppercase tracking-wider">CPF CADASTRADO</span>
                <span className="text-xs font-mono text-slate-300">{formatCPF(visitor.cpf)}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                id="btn-scan-qr"
                onClick={() => { setShowScanner(true); setErrorMsg(null); }}
                className="flex-1 py-3.5 bg-brand-orange hover:bg-brand-orange-hover font-display font-bold text-xs uppercase tracking-widest text-white rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/20 cursor-pointer active:scale-98 transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>Escanear QR Code</span>
              </button>
            </div>
          </motion.div>
        </div>



        {/* Transactions / History Feed */}
        <div className="flex-1 px-6 pt-4 flex flex-col z-10">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-bold tracking-widest text-white/50 font-mono uppercase">HISTÓRICO DE INVESTIMENTOS</h3>
            <span className="text-[10px] font-mono text-slate-500">
              {myTransactions.length} {myTransactions.length === 1 ? 'transação' : 'transações'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 min-h-[180px]">
            {myTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center text-slate-600 border border-dashed border-brand-border rounded-2xl p-4">
                <Clock className="w-8 h-8 stroke-[1.2] text-slate-700 mb-2" />
                <p className="text-xs">Nenhum investimento realizado ainda.</p>
                <p className="text-[10px] text-slate-700 mt-1 max-w-[180px]">
                  Clique no botão acima para transferir seus ECOS para as agências expositoras.
                </p>
              </div>
            ) : (
              myTransactions.map(tx => (
                <div 
                  key={tx.id}
                  className="flex justify-between items-center p-3.5 bg-brand-surface border border-brand-border hover:border-[#7C3AED]/30 rounded-xl transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-[#7C3AED]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{tx.agencyName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {new Date(tx.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-bold text-brand-orange flex items-center gap-0.5 justify-end">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      -{tx.amount}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 block">ECOS</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 1. REAL CAMERA & QR CODE SCANNER MODAL */}
      <AnimatePresence>
        {showScanner && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-brand-dark/95 z-40 flex flex-col p-6 text-white"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div className="flex items-center gap-2 text-brand-orange font-mono text-xs font-bold">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                CÂMERA & SCANNER QR CODE
              </div>
              <button 
                onClick={() => setShowScanner(false)}
                className="p-1.5 hover:bg-white/10 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewfinder & Interactive Simulation Panel */}
            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center justify-start gap-5 pb-4">
              
              {/* Real camera HTML5-QRCODE scanner */}
              <QrScannerComponent 
                onScanSuccess={handleScanSuccess} 
              />
              
              <div className="w-full max-w-xs text-center space-y-4 pt-1">
                <p className="text-[11px] text-white/50 font-sans max-w-xs leading-relaxed mx-auto">
                  Aponte a câmera para o QR Code da agência. Se a câmera estiver indisponível, use o simulador ou o código abaixo:
                </p>

                {/* Simulator Grid */}
                <div className="space-y-2">
                  <span className="block text-[9px] font-bold text-white/40 font-mono uppercase tracking-widest text-center">
                    Simular Leitura de Estande
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {state.agencies.map(a => (
                      <button
                        key={a.id}
                        onClick={() => handleScanSuccess(`https://ecos-credits.com/investir/${a.id}`)}
                        className="p-3.5 text-left bg-brand-surface hover:bg-brand-surface/80 border border-brand-border hover:border-brand-orange rounded-xl text-xs flex flex-col justify-between transition cursor-pointer active:scale-95 shadow-sm"
                      >
                        <span className="font-bold text-slate-200 line-clamp-1">{a.name}</span>
                        <span className="text-[9px] text-slate-500 font-mono mt-0.5">ID: {a.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual code input */}
                <div className="pt-4 border-t border-brand-border/60">
                  <form onSubmit={handleManualCodeSubmit} className="space-y-2">
                    <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                      Ou digite o ID da Agência
                    </label>
                    <div className="flex gap-2">
                      <input
                        name="agencyCode"
                        type="text"
                        placeholder="Ex: vortex"
                        className="flex-1 px-3 py-2 bg-brand-surface border border-brand-border rounded-xl text-xs font-mono text-center text-white focus:outline-none focus:border-brand-orange uppercase"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95 transition"
                      >
                        Ir
                      </button>
                    </div>
                  </form>
                </div>
              </div>

            </div>
            
            {errorMsg && (
              <p className="text-xs text-red-400 text-center font-sans mt-3 shrink-0">{errorMsg}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. TRANSACTION SHEET (INVESTMENT FORM) */}
      <AnimatePresence>
        {selectedAgencyId && selectedAgency && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="absolute inset-x-0 bottom-0 max-h-[85%] bg-brand-surface border-t border-brand-border rounded-t-[32px] z-30 p-6 flex flex-col text-white shadow-2xl"
          >
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-[#251F35] rounded-full mx-auto mb-4 shrink-0" />

            {/* Header */}
            <div className="flex justify-between items-start mb-4 shrink-0">
              <div>
                <span className="text-[9px] font-bold px-2 py-0.5 bg-brand-orange/10 border border-brand-orange/20 rounded-md text-brand-orange inline-block mb-1 font-mono tracking-wider">
                  PITCH INVESTMENT
                </span>
                <h3 className="text-lg font-display font-bold text-slate-100">{selectedAgency.name}</h3>
                <p className="text-xs text-white/50 font-sans italic mt-0.5">
                  "{selectedAgency.slogan}"
                </p>
              </div>
              <button 
                onClick={() => { setSelectedAgencyId(null); setErrorMsg(null); navigate('wallet'); }}
                className="p-1.5 bg-brand-dark rounded-full hover:bg-white/5 transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleInvestSubmit} className="flex-1 overflow-y-auto no-scrollbar space-y-5 py-2 flex flex-col justify-between">
              
              <div className="space-y-4">
                {/* Balance Helper */}
                <div className="p-3 bg-brand-dark border border-brand-border rounded-xl flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-mono">Seu saldo:</span>
                  <span className="font-mono font-bold text-brand-orange">{visitor.balance} ECOS</span>
                </div>

                {/* Amount Field */}
                <div className="space-y-2 text-center py-4 bg-brand-dark/50 border border-brand-border rounded-2xl">
                  <label className="block text-[10px] font-bold text-white/50 font-mono tracking-wider uppercase">
                    QUANTIDADE DE CRÉDITOS
                  </label>
                  
                  <div className="flex items-center justify-center gap-2">
                    <input
                      id="input-ecos-amount"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max={visitor.balance}
                      placeholder="0"
                      value={investAmount}
                      onChange={(e) => {
                        setErrorMsg(null);
                        setInvestAmount(e.target.value);
                      }}
                      className="w-36 text-center text-3xl font-mono font-bold bg-transparent border-b-2 border-[#251F35] focus:border-brand-orange text-white focus:outline-none placeholder-white/10"
                      required
                    />
                    <span className="text-lg font-mono font-bold text-brand-orange">ECOS</span>
                  </div>

                  {/* Quick value presets */}
                  <div className="flex gap-1.5 justify-center mt-4">
                    {[50, 100, 200, 500].map(val => (
                      <button
                        key={val}
                        type="button"
                        disabled={val > visitor.balance}
                        onClick={() => {
                          setErrorMsg(null);
                          setInvestAmount(val.toString());
                        }}
                        className="px-3 py-1 bg-brand-dark hover:bg-white/5 disabled:opacity-30 border border-brand-border rounded-lg text-[11px] font-mono transition cursor-pointer"
                      >
                        {val}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setInvestAmount(visitor.balance.toString());
                      }}
                      className="px-3 py-1 bg-[#F27D26]/15 hover:bg-[#F27D26]/30 border border-[#F27D26]/30 text-brand-orange rounded-lg text-[11px] font-mono transition cursor-pointer"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Error Box */}
                {errorMsg && (
                  <div className="p-3 bg-red-950/30 border border-red-900/30 rounded-xl text-xs text-red-300">
                    {errorMsg}
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="space-y-2 pt-4">
                <button
                  id="btn-confirm-investment"
                  type="submit"
                  disabled={isInvesting}
                  className="w-full py-4 bg-brand-orange hover:bg-brand-orange-hover text-white font-display font-bold text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-orange/20 active:scale-99 transition-all disabled:opacity-50"
                >
                  {isInvesting ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Processando...</span>
                    </div>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      <span>Confirmar Apoio</span>
                    </>
                  )}
                </button>
                
                <p className="text-center text-[10px] text-white/30 font-mono uppercase tracking-wider">
                  * Uma vez enviado, o crédito não poderá ser estornado.
                </p>
              </div>

            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. TRANSACTION COMPLETED (GAMIFIED CONGRATULATIONS MODAL) */}
      <AnimatePresence>
        {showSuccess && lastSuccessTx && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-brand-dark/98 z-50 flex flex-col items-center justify-center p-6 text-center"
          >
            {/* Flying Confetti Celebration */}
            <Confetti />

            <div className="absolute top-[-10%] w-[300px] h-[300px] rounded-full bg-brand-purple-light/20 blur-[100px]" />
            <div className="absolute bottom-[-10%] w-[300px] h-[300px] rounded-full bg-brand-orange/15 blur-[100px]" />

            <motion.div
              initial={{ scale: 0.8, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5, type: 'spring' }}
              className="space-y-6 max-w-xs relative z-10"
            >
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-[#F27D26] to-[#7C3AED] mx-auto shadow-xl shadow-brand-orange/20">
                <CheckCircle className="w-10 h-10 text-white stroke-[1.5]" />
                <motion.div 
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -top-1 -right-1 text-yellow-400"
                >
                  <Sparkles className="w-6 h-6" />
                </motion.div>
              </div>

              <div className="space-y-2">
                <h2 id="title-transacao-concluida" className="text-2xl font-display font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200">
                  Apoio Enviado!
                </h2>
                <p className="text-xs text-white/50 leading-relaxed">
                  Você enviou com sucesso seus créditos de apoio para a produção estudantil:
                </p>
              </div>

              {/* Transaction Receipt Card */}
              <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl text-left space-y-2 font-mono text-xs shadow-md">
                <div className="flex justify-between">
                  <span className="text-white/40">Destinatário:</span>
                  <span className="text-slate-200 font-sans font-bold">{lastSuccessTx.agencyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Valor Pago:</span>
                  <span className="text-brand-orange font-bold font-mono">{lastSuccessTx.amount} ECOS</span>
                </div>
                <div className="flex justify-between border-t border-brand-border pt-2 mt-1">
                  <span className="text-white/40">Comprovante:</span>
                  <span className="text-[#7C3AED] text-[10px] font-bold uppercase tracking-wider">Autenticado</span>
                </div>
              </div>

              <button
                id="btn-success-close"
                onClick={() => { setShowSuccess(false); setLastSuccessTx(null); }}
                className="w-full py-4 bg-white text-brand-dark hover:bg-slate-100 font-display font-bold text-sm uppercase tracking-wider rounded-2xl transition cursor-pointer"
              >
                Retornar à Carteira
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
