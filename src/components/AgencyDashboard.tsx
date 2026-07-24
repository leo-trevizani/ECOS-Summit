/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { ArrowLeft, TrendingUp, Users, RefreshCw, Key, ShieldCheck, HelpCircle, QrCode, Lock, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { generateSecureQRPayload } from '../utils/qrSecurity';

export const AgencyDashboard: React.FC = () => {
  const { state, currentParam, navigate } = useApp();
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Parse token from currentParam
  const tokenToUse = currentParam || '';
  
  // Find agency with this unique token
  const agency = state.agencies.find(a => a.token === tokenToUse);

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const targetToken = tokenInput.trim();
    const found = state.agencies.find(a => a.token === targetToken);
    
    if (found) {
      navigate(`agencia/${found.token}`);
    } else {
      setError('Token inválido. Verifique o código fornecido pela organização.');
    }
  };

  // If no agency is identified, show a lookup form
  if (!agency) {
    return (
      <div className="flex flex-col min-h-screen p-6 text-white bg-brand-dark justify-between relative pb-8">
        <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-brand-purple-light opacity-25 blur-[100px]" />
        
        {/* Header */}
        <div className="flex items-center gap-3 pt-2 z-10 shrink-0">
          <button
            onClick={() => navigate('welcome')}
            className="p-2 rounded-full bg-brand-surface border border-brand-border text-slate-300 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">PAINEL DE EXPOSITOR</h2>
            <h1 className="text-sm font-display font-bold tracking-tight text-slate-100">Portal das Agências</h1>
          </div>
        </div>

        {/* Form Body */}
        <div className="my-auto max-w-xs mx-auto w-full z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#F27D26] to-[#7C3AED] flex items-center justify-center mx-auto shadow-xl shadow-brand-orange/10">
              <Key className="w-8 h-8 text-white stroke-[1.5]" />
            </div>
            <h3 className="text-base font-display font-semibold text-slate-200">Acesse o seu Dashboard</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Insira o token de segurança único da sua agência estudantil para monitorar seu saldo e transações em tempo real.
            </p>
          </div>

          <form onSubmit={handleTokenSubmit} className="space-y-4">
            <div className="space-y-1">
              <input
                id="input-agency-token"
                type="text"
                placeholder="Ex: vortex-summit-2026"
                value={tokenInput}
                onChange={(e) => {
                  setError(null);
                  setTokenInput(e.target.value);
                }}
                className="w-full px-4 py-3.5 bg-brand-surface border border-brand-border rounded-xl text-center text-xs font-mono text-white focus:outline-none focus:border-brand-purple-light"
                required
              />
            </div>

            {error && (
              <p className="text-[11px] text-red-400 text-center">{error}</p>
            )}

            <button
              id="btn-access-dashboard"
              type="submit"
              className="w-full py-4 bg-brand-orange hover:bg-brand-orange-hover text-white font-display font-bold text-sm uppercase tracking-widest rounded-2xl transition cursor-pointer"
            >
              Acessar Painel Seguro
            </button>
          </form>

          {/* Quick simulation helper for presentation */}
          <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl space-y-3">
            <span className="text-[9px] font-bold text-white/40 block text-center font-mono uppercase tracking-wider">TOKENS ATIVOS DE EXPOSITORES</span>
            <div className="grid grid-cols-2 gap-1.5">
              {state.agencies.map(a => (
                <button
                  key={a.id}
                  onClick={() => navigate(`agencia/${a.token}`)}
                  className="p-2 text-[9px] font-mono text-slate-300 bg-brand-dark border border-brand-border rounded-lg hover:border-[#7C3AED] text-center truncate cursor-pointer"
                >
                  {a.name}: {a.token}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-white/20 mt-auto pt-4 font-sans uppercase tracking-widest">
          Privacidade ECOS Summit • Painéis Autônomos
        </p>
      </div>
    );
  }

  // Find all transactions targeting this agency
  const agencyTxList = state.transactions.filter(tx => tx.agencyId === agency.id);

  return (
    <div className="flex flex-col min-h-full flex-1 w-full bg-brand-dark text-white relative pb-8">
      {/* Decorative Glow */}
      <div className="absolute top-[-20%] left-[-20%] w-[350px] h-[350px] rounded-full bg-brand-purple-light opacity-20 blur-[100px] pointer-events-none" />

      <div className="flex flex-col w-full pb-6">
        
        {/* Header bar */}
        <div className="flex items-center justify-between p-6 pb-2 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              id="btn-dashboard-back"
              onClick={() => navigate('welcome')}
              className="p-2 rounded-full bg-brand-surface border border-brand-border text-slate-300 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-xs font-bold text-brand-orange flex items-center gap-1 font-mono uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-brand-orange" />
                PAINEL SEGURO DA EXPOSIÇÃO
              </span>
              <h1 className="text-base font-display font-bold text-slate-100">{agency.name}</h1>
            </div>
          </div>
          
          <button 
            id="btn-refresh-dashboard"
            onClick={() => navigate(`agencia/${agency.token}`)}
            className="p-2.5 bg-brand-surface border border-brand-border rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            title="Atualizar Dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Balance Display */}
        <div className="px-6 py-3 shrink-0 z-10">
          <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 relative overflow-hidden shadow-xl">
            <div className="absolute top-[-30px] right-[-30px] w-24 h-24 bg-brand-orange/10 rounded-full blur-2xl animate-pulse pointer-events-none" />
            
            <div className="space-y-1">
              <span className="text-xs font-bold text-white/60 uppercase tracking-wider block font-mono">
                RECEITA TOTAL ACUMULADA
              </span>
              <div className="flex items-baseline gap-2">
                <span id="label-agency-balance-value" className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200">
                  {agency.balance.toLocaleString('pt-BR')}
                </span>
                <span className="text-base font-mono font-bold text-brand-orange">créditos</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-brand-border pt-4 mt-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white/50 block font-mono">TOTAL DE APOIADORES</span>
                <div className="flex items-center gap-1.5">
                  <Users className="w-5 h-5 text-brand-purple-light" />
                  <span className="text-base font-semibold font-mono">{agencyTxList.length}</span>
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white/50 block font-mono">TENDÊNCIA ATUAL</span>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-semibold font-mono">Alta</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Official Booth QR Code Section */}
        <div className="px-6 py-2 shrink-0 z-10">
          <div className="bg-brand-surface border border-brand-border rounded-3xl p-5 flex flex-col md:flex-row items-center gap-5 shadow-lg relative overflow-hidden">
            <div className="p-4 bg-white rounded-2xl shrink-0 shadow-inner flex items-center justify-center">
              <QRCodeSVG 
                value={generateSecureQRPayload(agency.id, agency.token)} 
                size={140}
                level="H"
              />
            </div>
            
            <div className="flex-1 space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-1.5 text-brand-orange font-mono text-xs font-bold uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5 text-brand-orange" />
                <span>QR CODE OFICIAL DO ESTANDE (ANTIFRAUDE)</span>
              </div>
              <h3 className="text-sm font-display font-bold text-slate-100">Exiba ou imprima para receber aportes</h3>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Este código é encriptado para a segurança do evento. Ele <strong className="text-white font-bold">NÃO abre em câmeras comuns de celular</strong> nem gera links clicáveis da web, garantindo que o visitante deve estar presencialmente no seu estande e usando a câmera do aplicativo ECOS Summit para investir.
              </p>
              
              <div className="pt-2 flex flex-wrap justify-center md:justify-start gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-brand-dark hover:bg-white/10 border border-brand-border rounded-xl text-xs font-mono text-slate-200 flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Printer className="w-3.5 h-3.5 text-brand-orange" />
                  <span>Imprimir QR Code</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions list */}
        <div className="flex-1 px-6 pt-4 flex flex-col z-10">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-white/60 font-mono uppercase tracking-wider">ORIGEM DOS CRÉDITOS (APOIADORES)</h3>
            <span className="text-xs font-mono text-slate-400">Event Logs</span>
          </div>

          <div className="flex-1 bg-brand-surface border border-brand-border rounded-2xl overflow-hidden flex flex-col min-h-[220px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-dark/50 text-white/50 font-mono text-xs tracking-wider uppercase">
                    <th className="p-3.5">Visitante</th>
                    <th className="p-3.5 text-right">Valor</th>
                    <th className="p-3.5 text-right">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {agencyTxList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-400 italic text-sm">
                        Nenhum crédito recebido ainda nesta feira. Divulgue seu Pitch!
                      </td>
                    </tr>
                  ) : (
                    agencyTxList.map(tx => (
                      <tr key={tx.id} className="hover:bg-white/2 transition">
                        <td className="p-3.5 font-medium text-slate-200">
                          {tx.visitorName.split(' ')[0]} 
                          <span className="text-xs text-slate-400 font-mono block mt-0.5">
                            CPF: {tx.visitorCpf.slice(0, 3)}...
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-brand-orange text-base">
                          +{tx.amount}
                        </td>
                        <td className="p-3.5 text-right font-mono text-slate-400 text-xs">
                          {new Date(tx.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Footer warning */}
      <div className="p-4 bg-brand-surface border-t border-brand-border shrink-0 text-center flex items-center justify-center gap-2 text-xs text-slate-400 font-sans">
        <HelpCircle className="w-4 h-4 text-brand-orange shrink-0" />
        <span>Dúvidas na conciliação de saldo? Contate o Administrador Geral.</span>
      </div>
    </div>
  );
};
