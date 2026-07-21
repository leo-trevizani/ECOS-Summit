/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCPF } from '../utils/cpf';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  ShieldAlert, 
  Trash2, 
  Plus, 
  Sparkles,
  Database,
  Building2,
  Download,
  Award,
  Lock,
  Pencil
} from 'lucide-react';

export const AdminConsole: React.FC = () => {
  const { 
    state, 
    navigate, 
    addCpfToBlacklist, 
    removeCpfFromBlacklist, 
    importCpfListToBlacklist,
    createAgency,
    updateAgency,
    deleteAgency,
    resetAllData,
    investInAgency
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ranking' | 'blacklist' | 'visitors' | 'award' | 'agencies'>('ranking');
  const [newBlacklistCpf, setNewBlacklistCpf] = useState('');
  const [bulkCpfInput, setBulkCpfInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Agency Management State
  const [formAgencyId, setFormAgencyId] = useState('');
  const [formAgencyToken, setFormAgencyToken] = useState('');
  const [formAgencyName, setFormAgencyName] = useState('');
  const [formAgencySlogan, setFormAgencySlogan] = useState('');
  const [editingAgencyId, setEditingAgencyId] = useState<string | null>(null);

  // Admin Authentication State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (username.trim() === 'admin' && password === 'ecos-admin123') {
      setIsAuthenticated(true);
    } else {
      setLoginError('Usuário ou senha incorretos.');
    }
  };

  // Sorting agencies descending by balance for Ranking
  const rankedAgencies = [...state.agencies].sort((a, b) => b.balance - a.balance);
  const maxBalance = Math.max(...state.agencies.map(a => a.balance), 1);

  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await addCpfToBlacklist(newBlacklistCpf);
    if (result.success) {
      setSuccessMsg(`CPF ${formatCPF(newBlacklistCpf)} bloqueado com sucesso.`);
      setNewBlacklistCpf('');
    } else if (result.error) {
      setErrorMsg(result.error);
    }
  };

  const handleBulkImportCPFs = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!bulkCpfInput.trim()) {
      setErrorMsg('Por favor, informe ao menos um CPF.');
      return;
    }

    const lines = bulkCpfInput.split('\n').filter(line => line.trim() !== '');
    const result = await importCpfListToBlacklist(lines);

    if (result.success && result.importedCount > 0) {
      setSuccessMsg(`${result.importedCount} CPFs foram importados com sucesso para a lista de bloqueados.`);
      setBulkCpfInput('');
    } else {
      setErrorMsg('Nenhum CPF válido (com 11 dígitos) foi encontrado.');
    }
  };

  const handleExportCSV = () => {
    if (state.transactions.length === 0) {
      alert('Nenhuma transação registrada no momento.');
      return;
    }

    const headers = ['Nome do Visitante', 'CPF do Visitante', 'Agência Destino', 'Valor (ECOS)', 'Data e Hora'];
    const rows = state.transactions.map(tx => [
      tx.visitorName,
      formatCPF(tx.visitorCpf),
      tx.agencyName,
      tx.amount.toString(),
      new Date(tx.timestamp).toLocaleString('pt-BR')
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'ECOS_Summit_Relatorio_Transacoes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAgencyFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const idToUse = formAgencyId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const tokenToUse = formAgencyToken.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

    if (!formAgencyName.trim() || !idToUse || !tokenToUse) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (editingAgencyId) {
      const res = await updateAgency(editingAgencyId, tokenToUse, formAgencyName, formAgencySlogan);
      if (res.success) {
        setSuccessMsg(`Agência "${formAgencyName}" atualizada com sucesso!`);
        setFormAgencyId('');
        setFormAgencyToken('');
        setFormAgencyName('');
        setFormAgencySlogan('');
        setEditingAgencyId(null);
      } else {
        setErrorMsg(res.error || 'Erro ao atualizar agência.');
      }
    } else {
      const res = await createAgency(idToUse, tokenToUse, formAgencyName, formAgencySlogan);
      if (res.success) {
        setSuccessMsg(`Agência "${formAgencyName}" cadastrada com sucesso!`);
        setFormAgencyId('');
        setFormAgencyToken('');
        setFormAgencyName('');
        setFormAgencySlogan('');
      } else {
        setErrorMsg(res.error || 'Erro ao criar agência.');
      }
    }
  };

  const handleEditAgencyClick = (agency: typeof state.agencies[0]) => {
    setFormAgencyId(agency.id);
    setFormAgencyToken(agency.token);
    setFormAgencyName(agency.name);
    setFormAgencySlogan(agency.slogan);
    setEditingAgencyId(agency.id);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleDeleteAgencyClick = async (id: string, name: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (window.confirm(`Deseja realmente excluir permanentemente a agência "${name}"? Esta ação não pode ser desfeita.`)) {
      const res = await deleteAgency(id);
      if (res.success) {
        setSuccessMsg(`Agência "${name}" excluída com sucesso.`);
        if (editingAgencyId === id) {
          setFormAgencyId('');
          setFormAgencyToken('');
          setFormAgencyName('');
          setFormAgencySlogan('');
          setEditingAgencyId(null);
        }
      } else {
        setErrorMsg(res.error || 'Erro ao deletar agência.');
      }
    }
  };

  const handleCancelEditAgency = () => {
    setFormAgencyId('');
    setFormAgencyToken('');
    setFormAgencyName('');
    setFormAgencySlogan('');
    setEditingAgencyId(null);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Helper to pre-populate mock data so the reviewer can see rankings in action instantly via Firebase Firestore Batch
  const handleSeedDemoData = async () => {
    setErrorMsg(null);
    setSuccessMsg('Enviando apoios de simulação para o Firestore...');
    try {
      const mockVisitors = [
        { name: 'Ana Souza', cpf: '11111111111', balance: 500 },
        { name: 'Bruno Lima', cpf: '22222222222', balance: 200 },
        { name: 'Carla Dias', cpf: '33333333333', balance: 150 },
      ];

      const batch = writeBatch(db);

      // Save mock visitors
      mockVisitors.forEach(v => {
        batch.set(doc(db, 'visitors', v.cpf), { ...v, registeredAt: new Date().toISOString() });
      });

      // Create random transactions for agencies
      state.agencies.forEach((agency, index) => {
        const amount = (index + 1) * 350 + Math.floor(Math.random() * 200);
        const txId = `tx_seed_${index}_${Date.now()}`;
        const mockVisitor = mockVisitors[index % mockVisitors.length];
        
        batch.set(doc(db, 'transactions', txId), {
          id: txId,
          visitorCpf: mockVisitor.cpf,
          visitorName: mockVisitor.name,
          agencyId: agency.id,
          agencyName: agency.name,
          amount: amount,
          timestamp: new Date().toISOString()
        });

        // Update agency balance
        batch.set(doc(db, 'agencies', agency.id), {
          ...agency,
          balance: agency.balance + amount
        });
      });

      await batch.commit();
      setSuccessMsg('Dados de simulação seedados com sucesso no Firestore!');
    } catch (err: any) {
      setErrorMsg('Erro ao seedar dados: ' + err.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-brand-dark text-white flex flex-col justify-center items-center p-6 relative">
        {/* Decorative ambient blur glow */}
        <div className="absolute top-[-20%] left-[-20%] w-[400px] h-[400px] rounded-full bg-brand-purple-light opacity-10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[400px] h-[400px] rounded-full bg-brand-orange opacity-10 blur-[120px]" />

        <div className="w-full max-w-md bg-brand-surface border border-brand-border rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <button
              id="btn-login-back"
              onClick={() => navigate('welcome')}
              className="p-1.5 rounded-full bg-brand-dark border border-brand-border text-slate-400 hover:text-white transition cursor-pointer flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono text-brand-orange uppercase tracking-wider font-bold">ECOS SYSTEM SECURE</span>
          </div>

          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-gradient-to-tr from-brand-orange to-brand-purple rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-display text-xl font-bold text-slate-100">Acesso Restrito</h1>
            <p className="text-xs text-white/50">Insira as credenciais administrativas para gerenciar o ECOS Summit.</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-950/30 border border-red-900/30 rounded-xl text-xs text-red-300">
                {loginError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold font-mono text-white/40 uppercase tracking-wider block">Usuário</label>
              <input
                id="input-login-username"
                type="text"
                value={username}
                onChange={(e) => {
                  setLoginError(null);
                  setUsername(e.target.value);
                }}
                placeholder="Nome de usuário"
                className="w-full px-4 py-3 bg-brand-dark border border-brand-border rounded-xl font-sans text-xs text-white focus:outline-none focus:border-brand-orange"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold font-mono text-white/40 uppercase tracking-wider block">Senha</label>
              <input
                id="input-login-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setLoginError(null);
                  setPassword(e.target.value);
                }}
                placeholder="Digite a senha de administrador"
                className="w-full px-4 py-3 bg-brand-dark border border-brand-border rounded-xl font-sans text-xs text-white focus:outline-none focus:border-brand-orange"
                required
              />
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              className="w-full py-3.5 bg-brand-orange hover:bg-brand-orange-hover text-white font-display font-bold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 shadow-md shadow-brand-orange/10 mt-6"
            >
              <span>Entrar no Console</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-brand-dark text-white relative pb-8">
      {/* Glow */}
      <div className="absolute top-[-10%] left-[-20%] w-[350px] h-[350px] rounded-full bg-brand-orange opacity-15 blur-[100px]" />

      <div className="flex flex-col w-full pb-6">
        
        {/* Header App Bar */}
        <div className="flex items-center justify-between p-6 pb-2 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              id="btn-admin-back"
              onClick={() => navigate('welcome')}
              className="p-1.5 rounded-full bg-brand-surface border border-brand-border text-slate-300 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[9px] font-bold text-brand-orange flex items-center gap-1 font-mono uppercase tracking-wider">
                <Database className="w-3.5 h-3.5 text-brand-orange" />
                ECOS CORE CONSOLE
              </span>
              <h1 className="text-sm font-display font-bold text-slate-200">Administrador Geral</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button 
              id="btn-seed-data"
              onClick={handleSeedDemoData}
              className="text-[9px] font-mono font-bold uppercase tracking-wider text-brand-orange hover:text-white border border-brand-orange/30 hover:bg-brand-orange/10 transition px-2 py-1.5 rounded-lg flex items-center gap-0.5 cursor-pointer"
              title="Seedar Dados Demonstrativos"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Seed</span>
            </button>
            <button 
              id="btn-export-csv"
              onClick={handleExportCSV}
              className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 hover:text-white border border-emerald-500/30 hover:bg-emerald-500/10 transition px-2 py-1.5 rounded-lg flex items-center gap-0.5 cursor-pointer"
              title="Exportar Transações para CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="px-6 py-3 shrink-0 z-10">
          <div className="flex p-1 bg-brand-surface border border-brand-border rounded-xl">
            <button
              id="tab-ranking"
              onClick={() => { setActiveTab('ranking'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition ${
                activeTab === 'ranking' ? 'bg-[#7C3AED] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                Ranking
              </span>
            </button>
            <button
              id="tab-award"
              onClick={() => { setActiveTab('award'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition ${
                activeTab === 'award' ? 'bg-[#7C3AED] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <Award className="w-3.5 h-3.5" />
                Premiação
              </span>
            </button>
            <button
              id="tab-blacklist"
              onClick={() => { setActiveTab('blacklist'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition ${
                activeTab === 'blacklist' ? 'bg-[#7C3AED] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                Blocked
              </span>
            </button>
            <button
              id="tab-visitors"
              onClick={() => { setActiveTab('visitors'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition ${
                activeTab === 'visitors' ? 'bg-[#7C3AED] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5" />
                Apoiadores
              </span>
            </button>
            <button
              id="tab-agencies"
              onClick={() => { setActiveTab('agencies'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition ${
                activeTab === 'agencies' ? 'bg-[#7C3AED] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                Agências
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Section Contents */}
        <div className="flex-1 px-6 pt-2 z-10 flex flex-col">
          
          {/* Status Messages */}
          {errorMsg && (
            <div className="p-3 mb-3 bg-red-950/30 border border-red-900/30 rounded-xl text-xs text-red-300">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 mb-3 bg-emerald-950/30 border border-emerald-900/30 rounded-xl text-xs text-emerald-300">
              {successMsg}
            </div>
          )}

          {/* TAB 1: RANKING GERAL */}
          {activeTab === 'ranking' && (
            <div className="flex-1 flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-white/50 font-mono uppercase tracking-wider">ECOS LEADERBOARD RANKING</h3>
                <span className="text-[9px] font-mono text-brand-purple-light flex items-center gap-1">● Live Updates</span>
              </div>

              {/* Ranking Grid */}
              <div className="space-y-3">
                {rankedAgencies.map((agency, index) => {
                  const percentage = Math.max(10, (agency.balance / maxBalance) * 100);
                  const isTopOne = index === 0 && agency.balance > 0;
                  return (
                    <div 
                      key={agency.id}
                      className="p-4 bg-brand-surface border border-brand-border rounded-2xl flex flex-col gap-2 shadow-sm"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                            index === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            index === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                            index === 2 ? 'bg-amber-800/20 text-amber-500 border border-amber-800/30' :
                            'bg-brand-dark text-white/40 border border-brand-border'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-slate-100">{agency.name}</h4>
                              {isTopOne && <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />}
                            </div>
                            <span className="text-[9px] text-white/40 font-sans">ID: {agency.id}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-brand-orange">{agency.balance.toLocaleString('pt-BR')}</span>
                          <span className="text-[9px] font-mono text-white/40 block">ECOS</span>
                        </div>
                      </div>

                      {/* Performance Bar */}
                      <div className="w-full bg-brand-dark h-1.5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.6 }}
                          className={`h-full rounded-full bg-gradient-to-r ${
                            index === 0 ? 'from-[#F27D26] to-[#7C3AED]' :
                            'from-[#7C3AED]/70 to-[#7C3AED]'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PREMIAÇÃO (TROFÉU ESCOLHA DO MERCADO) */}
          {activeTab === 'award' && (
            <div className="flex-1 flex flex-col space-y-4">
              <span className="text-[10px] font-bold text-white/50 font-mono uppercase tracking-widest">RELATÓRIO DE PREMIAÇÃO</span>
              
              {rankedAgencies.length > 0 && rankedAgencies[0].balance > 0 ? (
                <div className="space-y-4">
                  {/* Winner Card */}
                  <div className="p-6 bg-gradient-to-br from-yellow-950/20 via-brand-surface to-brand-surface border border-yellow-500/40 rounded-3xl relative overflow-hidden shadow-xl text-center">
                    <div className="absolute top-2 right-2 text-yellow-400 animate-pulse">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-600 flex items-center justify-center mx-auto shadow-lg shadow-yellow-500/10 mb-4">
                      <Award className="w-10 h-10 text-white" />
                    </div>

                    <span className="text-[9px] font-bold font-mono px-3 py-1 bg-yellow-400/10 border border-yellow-400/20 rounded-full text-yellow-400 uppercase tracking-widest inline-block mb-2">
                      🏆 Vencedor Oficial
                    </span>
                    
                    <h2 className="text-2xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-200 to-yellow-100 uppercase tracking-tight">
                      {rankedAgencies[0].name}
                    </h2>
                    
                    <p className="text-xs text-white/60 italic font-sans max-w-xs mx-auto mt-1 mb-4">
                      "{rankedAgencies[0].slogan}"
                    </p>

                    <div className="py-2.5 px-4 bg-brand-dark/80 rounded-2xl inline-flex flex-col items-center border border-brand-border/40">
                      <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Receita Acumulada</span>
                      <span className="text-xl font-mono font-black text-yellow-400">
                        {rankedAgencies[0].balance.toLocaleString('pt-BR')} <span className="text-xs">ECOS</span>
                      </span>
                    </div>

                    <p className="text-[10px] text-yellow-500/70 font-sans font-medium mt-4">
                      Agraciada com o prestigiado <strong>Troféu Escolha do Mercado</strong> por votação soberana do público no ECOS Summit.
                    </p>
                  </div>

                  {/* Podium Runners Up */}
                  <div className="grid grid-cols-2 gap-3">
                    {rankedAgencies[1] && (
                      <div className="p-4 bg-brand-surface border border-slate-400/20 rounded-2xl text-center">
                        <span className="text-[9px] font-mono px-2 py-0.5 bg-slate-400/10 text-slate-300 rounded-full border border-slate-400/20 uppercase tracking-wider inline-block mb-1.5">🥈 2º Lugar</span>
                        <h4 className="text-xs font-bold text-slate-200 truncate">{rankedAgencies[1].name}</h4>
                        <p className="text-[11px] font-mono font-bold text-slate-400 mt-1">{rankedAgencies[1].balance.toLocaleString('pt-BR')} ECOS</p>
                      </div>
                    )}
                    {rankedAgencies[2] && (
                      <div className="p-4 bg-brand-surface border border-amber-800/20 rounded-2xl text-center">
                        <span className="text-[9px] font-mono px-2 py-0.5 bg-amber-800/10 text-amber-600 rounded-full border border-amber-800/20 uppercase tracking-wider inline-block mb-1.5">🥉 3º Lugar</span>
                        <h4 className="text-xs font-bold text-slate-200 truncate">{rankedAgencies[2].name}</h4>
                        <p className="text-[11px] font-mono font-bold text-amber-600 mt-1">{rankedAgencies[2].balance.toLocaleString('pt-BR')} ECOS</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-brand-surface border border-brand-border rounded-2xl text-center space-y-2">
                  <Award className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
                  <h3 className="text-xs font-bold text-slate-300">Sem Votação Registrada</h3>
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    Nenhum voto de crédito foi recebido por nenhuma agência estudantil até o momento. Registre transações de apoio para gerar a premiação em tempo real!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BLACKLIST DE CPFs BLOQUEADOS */}
          {activeTab === 'blacklist' && (
            <div className="flex-1 flex flex-col space-y-4">
              {/* Form to Block CPF */}
              <form onSubmit={handleAddBlacklist} className="p-4 bg-brand-surface border border-brand-border rounded-2xl space-y-3 shadow-md">
                <span className="block text-[10px] font-bold text-white/50 font-mono tracking-widest uppercase">Bloquear CPF Individual</span>
                <div className="flex gap-2">
                  <input
                    id="input-block-cpf"
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 12345678901"
                    maxLength={14}
                    value={newBlacklistCpf}
                    onChange={(e) => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setNewBlacklistCpf(e.target.value);
                    }}
                    className="flex-1 px-3 py-2 bg-brand-dark border border-brand-border rounded-xl font-mono text-xs text-white focus:outline-none focus:border-brand-orange"
                    required
                  />
                  <button
                    id="btn-add-blacklist"
                    type="submit"
                    className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Bloquear</span>
                  </button>
                </div>
              </form>

              {/* Bulk Import CPFs */}
              <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl space-y-3 shadow-md">
                <span className="block text-[10px] font-bold text-white/50 font-mono tracking-widest uppercase">Importar CPFs em Lote (Um por linha)</span>
                <textarea
                  id="textarea-bulk-cpfs"
                  rows={3}
                  placeholder="Cole uma lista de CPFs aqui...&#10;Ex:&#10;11122233344&#10;55566677788"
                  value={bulkCpfInput}
                  onChange={(e) => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setBulkCpfInput(e.target.value);
                  }}
                  className="w-full p-2.5 bg-brand-dark border border-brand-border rounded-xl font-mono text-[11px] text-white focus:outline-none focus:border-brand-orange resize-none"
                />
                <button
                  type="button"
                  onClick={handleBulkImportCPFs}
                  className="w-full py-2 bg-brand-purple hover:bg-[#7C3AED] border border-brand-purple-light/20 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Importar CPFs</span>
                </button>
              </div>

              {/* Blacklist Scroll */}
              <div className="flex-1 flex flex-col space-y-2">
                <h3 className="text-[10px] font-bold text-white/40 font-mono uppercase tracking-wider">Lista de Exclusão ({state.blacklist.length})</h3>
                
                <div className="flex-1 bg-brand-surface border border-brand-border rounded-2xl overflow-hidden min-h-[140px] flex flex-col">
                  <div className="overflow-y-auto max-h-[180px] no-scrollbar">
                    {state.blacklist.length === 0 ? (
                      <p className="p-4 text-center text-slate-500 italic text-xs">Nenhum CPF bloqueado no momento.</p>
                    ) : (
                      <ul className="divide-y divide-brand-border">
                        {state.blacklist.map(cpf => (
                          <li key={cpf} className="p-3 flex justify-between items-center text-xs font-mono">
                            <span className="text-slate-300">{formatCPF(cpf)}</span>
                            <button
                              onClick={() => {
                                removeCpfFromBlacklist(cpf);
                                setSuccessMsg(`CPF ${formatCPF(cpf)} removido da blacklist.`);
                              }}
                              className="p-1 text-slate-500 hover:text-red-400 transition cursor-pointer"
                              title="Remover Bloqueio"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VISITANTES REGISTRADOS */}
          {activeTab === 'visitors' && (
            <div className="flex-1 flex flex-col space-y-3">
              <h3 className="text-[10px] font-bold text-white/50 font-mono uppercase tracking-wider">APOIADORES CADASTRADOS ({state.visitors.length})</h3>
              
              <div className="flex-1 bg-brand-surface border border-brand-border rounded-2xl overflow-hidden flex flex-col min-h-[220px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-brand-border bg-brand-dark/50 text-white/40 font-mono text-[9px] tracking-wider uppercase">
                      <th className="p-3">Nome</th>
                      <th className="p-3">CPF</th>
                      <th className="p-3 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {state.visitors.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-slate-500 italic">
                          Nenhum visitante cadastrado até o momento.
                        </td>
                      </tr>
                    ) : (
                      state.visitors.map(visitor => (
                        <tr key={visitor.cpf} className="hover:bg-white/2 transition">
                          <td className="p-3 font-medium text-slate-300">{visitor.name}</td>
                          <td className="p-3 font-mono text-slate-400">{formatCPF(visitor.cpf)}</td>
                          <td className="p-3 text-right font-mono font-bold text-brand-orange">{visitor.balance} ECOS</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: GERENCIAR AGÊNCIAS */}
          {activeTab === 'agencies' && (
            <div className="flex-1 flex flex-col space-y-4">
              {/* Form to Create/Edit Agency */}
              <form onSubmit={handleAgencyFormSubmit} className="p-4 bg-brand-surface border border-brand-border rounded-2xl space-y-3 shadow-md">
                <div className="flex justify-between items-center">
                  <span className="block text-[10px] font-bold text-white/50 font-mono tracking-widest uppercase">
                    {editingAgencyId ? 'Editar Agência Estudantil' : 'Cadastrar Nova Agência Estudantil'}
                  </span>
                  {editingAgencyId && (
                    <span className="text-[9px] font-mono font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full border border-brand-orange/20 animate-pulse">
                      Modo de Edição
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold font-mono text-white/40 uppercase tracking-wider block">
                      Nome da Agência *
                    </label>
                    <input
                      id="input-agency-name"
                      type="text"
                      placeholder="Ex: Agência Vortex"
                      value={formAgencyName}
                      onChange={(e) => setFormAgencyName(e.target.value)}
                      className="w-full px-3 py-2 bg-brand-dark border border-brand-border rounded-xl font-sans text-xs text-white focus:outline-none focus:border-brand-orange"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold font-mono text-white/40 uppercase tracking-wider block">
                      ID / Slug único * (letras, números e hífens)
                    </label>
                    <input
                      id="input-agency-id"
                      type="text"
                      placeholder="Ex: vortex"
                      value={formAgencyId}
                      onChange={(e) => {
                        if (!editingAgencyId) {
                          setFormAgencyId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                        }
                      }}
                      disabled={!!editingAgencyId}
                      className="w-full px-3 py-2 bg-brand-dark border border-brand-border rounded-xl font-mono text-xs text-white focus:outline-none focus:border-brand-orange disabled:opacity-40 disabled:cursor-not-allowed"
                      required
                    />
                    <span className="text-[8px] text-white/30 block mt-0.5 font-mono">
                      Usado para deep linking: /investir/[id]
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold font-mono text-white/40 uppercase tracking-wider block">
                      Token / Chave de Acesso * (letras, números e hífens)
                    </label>
                    <input
                      id="input-agency-token"
                      type="text"
                      placeholder="Ex: vortex-admin-99"
                      value={formAgencyToken}
                      onChange={(e) => setFormAgencyToken(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      className="w-full px-3 py-2 bg-brand-dark border border-brand-border rounded-xl font-mono text-xs text-white focus:outline-none focus:border-brand-orange"
                      required
                    />
                    <span className="text-[8px] text-white/30 block mt-0.5 font-mono">
                      Usado para acessar o painel: /agencia/[token]
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold font-mono text-white/40 uppercase tracking-wider block">
                      Slogan ou Descrição Curta
                    </label>
                    <input
                      id="input-agency-slogan"
                      type="text"
                      placeholder="Ex: Inovação e design para o futuro."
                      value={formAgencySlogan}
                      onChange={(e) => setFormAgencySlogan(e.target.value)}
                      className="w-full px-3 py-2 bg-brand-dark border border-brand-border rounded-xl font-sans text-xs text-white focus:outline-none focus:border-brand-orange"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  {editingAgencyId && (
                    <button
                      id="btn-cancel-edit-agency"
                      type="button"
                      onClick={handleCancelEditAgency}
                      className="px-4 py-2 bg-brand-dark hover:bg-white/5 border border-brand-border text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    id="btn-submit-agency"
                    type="submit"
                    className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    {editingAgencyId ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{editingAgencyId ? 'Salvar Alterações' : 'Criar Agência'}</span>
                  </button>
                </div>
              </form>

              {/* Agencies List */}
              <div className="flex-1 flex flex-col space-y-2">
                <h3 className="text-[10px] font-bold text-white/40 font-mono uppercase tracking-wider">
                  Agências Registradas ({state.agencies.length})
                </h3>
                
                <div className="flex-1 bg-brand-surface border border-brand-border rounded-2xl overflow-hidden min-h-[220px] flex flex-col">
                  <div className="overflow-y-auto max-h-[300px] no-scrollbar divide-y divide-brand-border">
                    {state.agencies.length === 0 ? (
                      <p className="p-8 text-center text-slate-500 italic text-xs">Nenhuma agência cadastrada no momento.</p>
                    ) : (
                      state.agencies.map(agency => (
                        <div key={agency.id} className="p-4 flex justify-between items-start gap-4 hover:bg-white/2 transition">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-bold text-slate-100">{agency.name}</h4>
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-brand-orange/10 text-brand-orange border border-brand-orange/20 rounded">
                                {agency.balance.toLocaleString('pt-BR')} ECOS
                              </span>
                            </div>
                            <p className="text-[10px] text-white/50 truncate mt-0.5">
                              {agency.slogan || <span className="italic text-white/20">Sem slogan cadastrado</span>}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 text-[9px] font-mono text-white/30 flex-wrap">
                              <span>ID/Link: <strong className="text-slate-400 font-bold">/investir/{agency.id}</strong></span>
                              <span>•</span>
                              <span>Dashboard: <strong className="text-slate-400 font-bold">/agencia/{agency.token}</strong></span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleEditAgencyClick(agency)}
                              className="p-1.5 rounded-lg border border-brand-border/40 bg-brand-dark/50 text-slate-400 hover:text-brand-orange hover:border-brand-orange/30 transition cursor-pointer"
                              title="Editar Agência"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAgencyClick(agency.id, agency.name)}
                              className="p-1.5 rounded-lg border border-brand-border/40 bg-brand-dark/50 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition cursor-pointer"
                              title="Excluir Agência"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Limpar Base de Dados Button with Confirmation */}
        <div className="px-6 pt-4 shrink-0 z-10 border-t border-brand-border mt-4">
          <button
            id="btn-factory-reset"
            onClick={() => {
              if (window.confirm('Confirmação Crítica: Deseja realmente Limpar toda a Base de Dados? Todos os visitantes, saldos e históricos de transações serão permanentemente deletados.')) {
                resetAllData();
                setSuccessMsg('Toda a base de dados do ECOS Summit foi limpa com sucesso.');
              }
            }}
            className="w-full py-3 bg-red-950/20 border border-red-900/40 text-red-300 hover:bg-red-950/40 font-mono text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Database className="w-3.5 h-3.5 text-red-400" />
            <span>Limpar Base de Dados (Reset)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
