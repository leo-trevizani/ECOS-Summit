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
  Pencil,
  QrCode,
  Printer,
  X,
  MapPin,
  Navigation,
  Compass,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { generateSecureQRPayload } from '../utils/qrSecurity';
import { 
  geocodeAddress, 
  reverseGeocode, 
  getDevicePosition, 
  calculateDistanceMeters, 
  formatDistance 
} from '../utils/geolocation';

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
    investInAgency,
    geofenceConfig,
    updateGeofenceConfig
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ranking' | 'blacklist' | 'visitors' | 'award' | 'agencies' | 'geofence'>('ranking');
  const [newBlacklistCpf, setNewBlacklistCpf] = useState('');
  const [bulkCpfInput, setBulkCpfInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Geofencing Management State
  const [geoEnabled, setGeoEnabled] = useState(geofenceConfig?.enabled ?? false);
  const [geoAddress, setGeoAddress] = useState(geofenceConfig?.address ?? 'Expo PP - Centro de Eventos');
  const [geoLat, setGeoLat] = useState(geofenceConfig?.latitude?.toString() ?? '-23.550520');
  const [geoLng, setGeoLng] = useState(geofenceConfig?.longitude?.toString() ?? '-46.633308');
  const [geoRadius, setGeoRadius] = useState<number>(geofenceConfig?.radiusMeters ?? 300);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGettingCurrentLoc, setIsGettingCurrentLoc] = useState(false);
  const [isTestingDistance, setIsTestingDistance] = useState(false);
  const [testDistanceResult, setTestDistanceResult] = useState<{
    distance: number;
    isInside: boolean;
    lat: number;
    lng: number;
    simulated?: boolean;
  } | null>(null);
  const [testDistanceError, setTestDistanceError] = useState<string | null>(null);
  const [isSavingGeofence, setIsSavingGeofence] = useState(false);

  // Sync state whenever remote geofenceConfig updates from Firestore
  React.useEffect(() => {
    if (geofenceConfig) {
      setGeoEnabled(geofenceConfig.enabled);
      setGeoAddress(geofenceConfig.address || 'Expo PP - Centro de Eventos');
      setGeoLat(geofenceConfig.latitude?.toString() || '-23.550520');
      setGeoLng(geofenceConfig.longitude?.toString() || '-46.633308');
      setGeoRadius(geofenceConfig.radiusMeters || 300);
    }
  }, [geofenceConfig]);

  // Agency Management State
  const [formAgencyId, setFormAgencyId] = useState('');
  const [formAgencyToken, setFormAgencyToken] = useState('');
  const [formAgencyName, setFormAgencyName] = useState('');
  const [formAgencySlogan, setFormAgencySlogan] = useState('');
  const [editingAgencyId, setEditingAgencyId] = useState<string | null>(null);
  const [selectedAgencyForQr, setSelectedAgencyForQr] = useState<typeof state.agencies[0] | null>(null);

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

    const headers = ['Nome do Visitante', 'CPF do Visitante', 'Agência Destino', 'Valor (Créditos)', 'Data e Hora'];
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
    link.setAttribute('download', 'Expo_PP_Relatorio_Transacoes.csv');
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

  // Geofence Handlers
  const handleSearchAddress = async () => {
    if (!geoAddress.trim()) {
      setErrorMsg('Por favor, informe um endereço para localizar no mapa.');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsGeocoding(true);
    try {
      const res = await geocodeAddress(geoAddress);
      setIsGeocoding(false);
      if (res.success && res.latitude !== undefined && res.longitude !== undefined) {
        setGeoLat(res.latitude.toFixed(6));
        setGeoLng(res.longitude.toFixed(6));
        if (res.displayName) {
          setGeoAddress(res.displayName);
        }
        setSuccessMsg(`Coordenadas obtidas: Lat ${res.latitude.toFixed(6)}, Lng ${res.longitude.toFixed(6)}`);
      } else {
        setErrorMsg(res.error || 'Não foi possível encontrar este endereço.');
      }
    } catch (err: any) {
      setIsGeocoding(false);
      setErrorMsg('Erro ao consultar endereço: ' + err.message);
    }
  };

  const handleUseCurrentLocation = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsGettingCurrentLoc(true);
    try {
      const pos = await getDevicePosition();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setGeoLat(lat.toFixed(6));
      setGeoLng(lng.toFixed(6));
      setIsGettingCurrentLoc(false);
      setSuccessMsg(`Localização capturada com sucesso: (${lat.toFixed(6)}, ${lng.toFixed(6)}). Buscando endereço...`);

      const addr = await reverseGeocode(lat, lng);
      if (addr) {
        setGeoAddress(addr);
      }
    } catch (err: any) {
      setIsGettingCurrentLoc(false);
      setErrorMsg('Falha ao obter localização: ' + (err.message || 'Permissão negada ou GPS indisponível.'));
    }
  };

  const handleTestDistance = async () => {
    setErrorMsg(null);
    setTestDistanceError(null);
    setIsTestingDistance(true);
    setTestDistanceResult(null);
    try {
      const cleanLatStr = String(geoLat || '').replace(',', '.').trim();
      const cleanLngStr = String(geoLng || '').replace(',', '.').trim();
      const parsedLat = parseFloat(cleanLatStr);
      const parsedLng = parseFloat(cleanLngStr);
      const radius = Number(geoRadius) || 300;

      if (isNaN(parsedLat) || isNaN(parsedLng)) {
        setIsTestingDistance(false);
        const err = 'Coordenadas do evento inválidas. Preencha a latitude e longitude.';
        setErrorMsg(err);
        setTestDistanceError(err);
        return;
      }

      // Robust getDevicePosition with high-accuracy to network-accuracy fallback
      const pos = await getDevicePosition();
      const currentLat = pos.coords.latitude;
      const currentLng = pos.coords.longitude;
      const dist = calculateDistanceMeters(currentLat, currentLng, parsedLat, parsedLng);
      const isInside = dist <= radius;

      setIsTestingDistance(false);
      setTestDistanceResult({
        distance: dist,
        isInside,
        lat: currentLat,
        lng: currentLng,
        simulated: false,
      });
      setSuccessMsg(`Distância calculada: ${formatDistance(dist)} (${isInside ? 'Dentro do raio' : 'Fora do raio'}).`);
    } catch (err: any) {
      setIsTestingDistance(false);
      const msg = err.message || 'Verifique se a permissão de GPS está ativa no navegador.';
      setErrorMsg('Erro ao testar distância: ' + msg);
      setTestDistanceError(msg);
    }
  };

  const handleSimulateDistance = (meters: number) => {
    setTestDistanceError(null);
    setErrorMsg(null);
    const cleanLatStr = String(geoLat || '').replace(',', '.').trim();
    const cleanLngStr = String(geoLng || '').replace(',', '.').trim();
    const parsedLat = parseFloat(cleanLatStr);
    const parsedLng = parseFloat(cleanLngStr);
    const radius = Number(geoRadius) || 300;

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setErrorMsg('Preencha a latitude e longitude do evento primeiro.');
      return;
    }

    // 1 deg latitude is approx 111,320 meters
    const latOffset = meters / 111320;
    const simLat = parsedLat + latOffset;
    const simLng = parsedLng;
    const dist = calculateDistanceMeters(simLat, simLng, parsedLat, parsedLng);
    const isInside = dist <= radius;

    setTestDistanceResult({
      distance: dist,
      isInside,
      lat: simLat,
      lng: simLng,
      simulated: true,
    });
    setSuccessMsg(`Simulação aplicada: ${formatDistance(dist)} (${isInside ? 'Dentro do raio' : 'Fora do raio'}).`);
  };

  const handleSaveGeofence = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const parsedLat = parseFloat(geoLat);
    const parsedLng = parseFloat(geoLng);
    const parsedRadius = Number(geoRadius);

    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      setErrorMsg('Latitude inválida. Deve estar entre -90 e 90.');
      return;
    }
    if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      setErrorMsg('Longitude inválida. Deve estar entre -180 e 180.');
      return;
    }
    if (isNaN(parsedRadius) || parsedRadius < 10) {
      setErrorMsg('Raio inválido. O raio mínimo recomendado é de 10 metros.');
      return;
    }

    setIsSavingGeofence(true);
    const res = await updateGeofenceConfig({
      enabled: geoEnabled,
      address: geoAddress.trim() || 'Expo PP - Centro de Eventos',
      latitude: parsedLat,
      longitude: parsedLng,
      radiusMeters: parsedRadius,
    });
    setIsSavingGeofence(false);

    if (res.success) {
      setSuccessMsg(
        geoEnabled
          ? `Geolocalização ATIVADA com sucesso! Raio configurado: ${formatDistance(parsedRadius)}.`
          : 'Geolocalização DESATIVADA com sucesso (Modo de testes livre ativo).'
      );
    } else {
      setErrorMsg(res.error || 'Erro ao salvar configurações de geolocalização.');
    }
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
            <span className="text-[10px] font-mono text-brand-orange uppercase tracking-wider font-bold">EXPO PP SYSTEM SECURE</span>
          </div>

          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-gradient-to-tr from-brand-orange to-brand-purple rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-display text-xl font-bold text-slate-100">Acesso Restrito</h1>
            <p className="text-xs text-white/50">Insira as credenciais administrativas para gerenciar o Expo PP.</p>
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
    <div className="flex flex-col min-h-full flex-1 w-full bg-brand-dark text-white relative pb-8 overflow-hidden">
      {/* Glow */}
      <div className="absolute top-[-10%] left-[-20%] w-[350px] h-[350px] rounded-full bg-brand-orange opacity-15 blur-[100px] pointer-events-none" />

      <div className="flex flex-col w-full pb-6">
        
        {/* Header App Bar */}
        <div className="flex items-center justify-between p-6 pb-2 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              id="btn-admin-back"
              onClick={() => navigate('welcome')}
              className="p-2 rounded-full bg-brand-surface border border-brand-border text-slate-300 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-xs font-bold text-brand-orange flex items-center gap-1 font-mono uppercase tracking-wider">
                <Database className="w-4 h-4 text-brand-orange" />
                EXPO PP CORE CONSOLE
              </span>
              <h1 className="text-base font-display font-bold text-slate-100">Administrador Geral</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              id="btn-seed-data"
              onClick={handleSeedDemoData}
              className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange hover:text-white border border-brand-orange/30 hover:bg-brand-orange/10 transition px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
              title="Seedar Dados Demonstrativos"
            >
              <Sparkles className="w-4 h-4" />
              <span>Seed</span>
            </button>
            <button 
              id="btn-export-csv"
              onClick={handleExportCSV}
              className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 hover:text-white border border-emerald-500/30 hover:bg-emerald-500/10 transition px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
              title="Exportar Transações para CSV"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Tab Selection Dropdown */}
        <div className="px-6 py-3 shrink-0 z-10">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-2 shadow-md">
            <label htmlFor="admin-tab-select" className="text-xs font-mono text-slate-400 uppercase tracking-widest font-bold shrink-0">
              SEÇÃO ADMINISTRATIVA:
            </label>
            <select
              id="admin-tab-select"
              value={activeTab}
              onChange={(e) => {
                setActiveTab(e.target.value as any);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="w-full bg-brand-dark border border-brand-border text-slate-100 font-display font-bold text-sm py-2.5 px-3 rounded-xl focus:outline-none focus:border-brand-purple-light cursor-pointer transition-colors"
            >
              <option value="ranking">🏆 Ranking Geral</option>
              <option value="award">🎗️ Premiação Oficial</option>
              <option value="geofence">📍 Raio & Geolocalização</option>
              <option value="blacklist">🛡️ CPFs Bloqueados</option>
              <option value="visitors">👥 Lista de Apoiadores</option>
              <option value="agencies">🏢 Gerenciar Agências</option>
            </select>
          </div>
        </div>

        {/* Dynamic Section Contents */}
        <div className="flex-1 px-6 pt-2 z-10 flex flex-col">
          
          {/* Status Messages */}
          {errorMsg && (
            <div className="p-3.5 mb-3 bg-red-950/40 border border-red-800/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 mb-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: RANKING GERAL */}
          {activeTab === 'ranking' && (
            <div className="flex-1 flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-white/60 font-mono uppercase tracking-wider">RANKING DE CRÉDITOS</h3>
                <span className="text-xs font-mono text-brand-purple-light flex items-center gap-1">● Live Updates</span>
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
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                            index === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            index === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                            index === 2 ? 'bg-amber-800/20 text-amber-500 border border-amber-800/30' :
                            'bg-brand-dark text-white/40 border border-brand-border'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-bold text-slate-100">{agency.name}</h4>
                              {isTopOne && <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />}
                            </div>
                            <span className="text-xs text-white/40 font-sans">ID: {agency.id}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-mono font-bold text-brand-orange">{agency.balance.toLocaleString('pt-BR')}</span>
                          <span className="text-xs font-mono text-white/40 block">créditos</span>
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
                      <span className="text-xs font-mono text-white/50 uppercase tracking-widest">Receita Acumulada</span>
                      <span className="text-2xl font-mono font-black text-yellow-400">
                        {rankedAgencies[0].balance.toLocaleString('pt-BR')} <span className="text-sm">créditos</span>
                      </span>
                    </div>

                    <p className="text-xs text-yellow-500/80 font-sans font-medium mt-4">
                      Agraciada com o prestigiado <strong>Troféu Escolha do Mercado</strong> por votação soberana do público no Expo PP.
                    </p>
                  </div>

                  {/* Podium Runners Up */}
                  <div className="grid grid-cols-2 gap-3">
                    {rankedAgencies[1] && (
                      <div className="p-4 bg-brand-surface border border-slate-400/20 rounded-2xl text-center">
                        <span className="text-xs font-mono px-2.5 py-0.5 bg-slate-400/10 text-slate-300 rounded-full border border-slate-400/20 uppercase tracking-wider inline-block mb-1.5">🥈 2º Lugar</span>
                        <h4 className="text-sm font-bold text-slate-100 truncate">{rankedAgencies[1].name}</h4>
                        <p className="text-xs font-mono font-bold text-slate-300 mt-1">{rankedAgencies[1].balance.toLocaleString('pt-BR')} créditos</p>
                      </div>
                    )}
                    {rankedAgencies[2] && (
                      <div className="p-4 bg-brand-surface border border-amber-800/20 rounded-2xl text-center">
                        <span className="text-xs font-mono px-2.5 py-0.5 bg-amber-800/10 text-amber-500 rounded-full border border-amber-800/20 uppercase tracking-wider inline-block mb-1.5">🥉 3º Lugar</span>
                        <h4 className="text-sm font-bold text-slate-100 truncate">{rankedAgencies[2].name}</h4>
                        <p className="text-xs font-mono font-bold text-amber-500 mt-1">{rankedAgencies[2].balance.toLocaleString('pt-BR')} créditos</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-brand-surface border border-brand-border rounded-2xl text-center space-y-2">
                  <Award className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
                  <h3 className="text-sm font-bold text-slate-200">Sem Votação Registrada</h3>
                  <p className="text-xs text-white/50 leading-relaxed">
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
                <span className="block text-xs font-bold text-white/60 font-mono tracking-widest uppercase">Bloquear CPF Individual</span>
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
                    className="flex-1 px-3.5 py-2.5 bg-brand-dark border border-brand-border rounded-xl font-mono text-sm text-white focus:outline-none focus:border-brand-orange"
                    required
                  />
                  <button
                    id="btn-add-blacklist"
                    type="submit"
                    className="px-4 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Bloquear</span>
                  </button>
                </div>
              </form>

              {/* Bulk Import CPFs */}
              <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl space-y-3 shadow-md">
                <span className="block text-xs font-bold text-white/60 font-mono tracking-widest uppercase">Importar CPFs em Lote (Um por linha)</span>
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
                  className="w-full p-3 bg-brand-dark border border-brand-border rounded-xl font-mono text-xs text-white focus:outline-none focus:border-brand-orange resize-none"
                />
                <button
                  type="button"
                  onClick={handleBulkImportCPFs}
                  className="w-full py-2.5 bg-brand-purple hover:bg-[#7C3AED] border border-brand-purple-light/20 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Importar CPFs</span>
                </button>
              </div>

              {/* Blacklist Scroll */}
              <div className="flex-1 flex flex-col space-y-2">
                <h3 className="text-xs font-bold text-white/50 font-mono uppercase tracking-wider">Lista de Exclusão ({state.blacklist.length})</h3>
                
                <div className="flex-1 bg-brand-surface border border-brand-border rounded-2xl overflow-hidden min-h-[140px] flex flex-col">
                  <div className="overflow-y-auto max-h-[180px] no-scrollbar">
                    {state.blacklist.length === 0 ? (
                      <p className="p-4 text-center text-slate-400 italic text-xs">Nenhum CPF bloqueado no momento.</p>
                    ) : (
                      <ul className="divide-y divide-brand-border">
                        {state.blacklist.map(cpf => (
                          <li key={cpf} className="p-3 flex justify-between items-center text-xs font-mono">
                            <span className="text-slate-200">{formatCPF(cpf)}</span>
                            <button
                              onClick={() => {
                                removeCpfFromBlacklist(cpf);
                                setSuccessMsg(`CPF ${formatCPF(cpf)} removido da blacklist.`);
                              }}
                              className="p-1 text-slate-400 hover:text-red-400 transition cursor-pointer"
                              title="Remover Bloqueio"
                            >
                              <Trash2 className="w-4 h-4" />
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
              <h3 className="text-xs font-bold text-white/60 font-mono uppercase tracking-wider">APOIADORES CADASTRADOS ({state.visitors.length})</h3>
              
              <div className="flex-1 bg-brand-surface border border-brand-border rounded-2xl overflow-hidden flex flex-col min-h-[220px]">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-brand-border bg-brand-dark/50 text-white/50 font-mono text-xs tracking-wider uppercase">
                      <th className="p-3.5">Nome</th>
                      <th className="p-3.5">CPF</th>
                      <th className="p-3.5 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {state.visitors.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-slate-400 italic text-sm">
                          Nenhum visitante cadastrado até o momento.
                        </td>
                      </tr>
                    ) : (
                      state.visitors.map(visitor => (
                        <tr key={visitor.cpf} className="hover:bg-white/2 transition">
                          <td className="p-3.5 font-medium text-slate-200">{visitor.name}</td>
                          <td className="p-3.5 font-mono text-slate-400">{formatCPF(visitor.cpf)}</td>
                          <td className="p-3.5 text-right font-mono font-bold text-brand-orange">{visitor.balance} créditos</td>
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
                  <span className="block text-xs font-bold text-white/60 font-mono tracking-widest uppercase">
                    {editingAgencyId ? 'Editar Agência Estudantil' : 'Cadastrar Nova Agência Estudantil'}
                  </span>
                  {editingAgencyId && (
                    <span className="text-xs font-mono font-bold text-brand-orange bg-brand-orange/10 px-2.5 py-0.5 rounded-full border border-brand-orange/20 animate-pulse">
                      Modo de Edição
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold font-mono text-white/50 uppercase tracking-wider block">
                      Nome da Agência *
                    </label>
                    <input
                      id="input-agency-name"
                      type="text"
                      placeholder="Ex: Agência Vortex"
                      value={formAgencyName}
                      onChange={(e) => setFormAgencyName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-brand-dark border border-brand-border rounded-xl font-sans text-sm text-white focus:outline-none focus:border-brand-orange"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold font-mono text-white/50 uppercase tracking-wider block">
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
                      className="w-full px-3.5 py-2.5 bg-brand-dark border border-brand-border rounded-xl font-mono text-sm text-white focus:outline-none focus:border-brand-orange disabled:opacity-40 disabled:cursor-not-allowed"
                      required
                    />
                    <span className="text-[10px] text-white/40 block mt-0.5 font-mono">
                      Usado para deep linking: /investir/[id]
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold font-mono text-white/50 uppercase tracking-wider block">
                      Token / Chave de Acesso * (letras, números e hífens)
                    </label>
                    <input
                      id="input-agency-token"
                      type="text"
                      placeholder="Ex: vortex-admin-99"
                      value={formAgencyToken}
                      onChange={(e) => setFormAgencyToken(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      className="w-full px-3.5 py-2.5 bg-brand-dark border border-brand-border rounded-xl font-mono text-sm text-white focus:outline-none focus:border-brand-orange"
                      required
                    />
                    <span className="text-[10px] text-white/40 block mt-0.5 font-mono">
                      Usado para acessar o painel: /agencia/[token]
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold font-mono text-white/50 uppercase tracking-wider block">
                      Slogan ou Descrição Curta
                    </label>
                    <input
                      id="input-agency-slogan"
                      type="text"
                      placeholder="Ex: Inovação e design para o futuro."
                      value={formAgencySlogan}
                      onChange={(e) => setFormAgencySlogan(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-brand-dark border border-brand-border rounded-xl font-sans text-sm text-white focus:outline-none focus:border-brand-orange"
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
                    className="px-4 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    {editingAgencyId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{editingAgencyId ? 'Salvar Alterações' : 'Criar Agência'}</span>
                  </button>
                </div>
              </form>

              {/* Agencies List */}
              <div className="flex-1 flex flex-col space-y-2">
                <h3 className="text-xs font-bold text-white/50 font-mono uppercase tracking-wider">
                  Agências Registradas ({state.agencies.length})
                </h3>
                
                <div className="flex-1 bg-brand-surface border border-brand-border rounded-2xl overflow-hidden min-h-[220px] flex flex-col">
                  <div className="overflow-y-auto max-h-[300px] no-scrollbar divide-y divide-brand-border">
                    {state.agencies.length === 0 ? (
                      <p className="p-8 text-center text-slate-400 italic text-sm">Nenhuma agência cadastrada no momento.</p>
                    ) : (
                      state.agencies.map(agency => (
                        <div key={agency.id} className="p-4 flex justify-between items-start gap-4 hover:bg-white/2 transition">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-100">{agency.name}</h4>
                              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-brand-orange/10 text-brand-orange border border-brand-orange/20 rounded">
                                {agency.balance.toLocaleString('pt-BR')} créditos
                              </span>
                            </div>
                            <p className="text-xs text-white/60 truncate mt-0.5">
                              {agency.slogan || <span className="italic text-white/30">Sem slogan cadastrado</span>}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs font-mono text-white/40 flex-wrap">
                              <span>ID/Link: <strong className="text-slate-300 font-bold">/investir/{agency.id}</strong></span>
                              <span>•</span>
                              <span>Dashboard: <strong className="text-slate-300 font-bold">/agencia/{agency.token}</strong></span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => setSelectedAgencyForQr(agency)}
                              className="p-2 rounded-lg border border-brand-orange/30 bg-brand-orange/10 text-brand-orange hover:bg-brand-orange/20 transition cursor-pointer flex items-center gap-1 text-xs font-mono font-bold"
                              title="Gerar QR Code Oficial"
                            >
                              <QrCode className="w-4 h-4" />
                              <span className="hidden sm:inline">QR Code</span>
                            </button>
                            <button
                              onClick={() => handleEditAgencyClick(agency)}
                              className="p-2 rounded-lg border border-brand-border/40 bg-brand-dark/50 text-slate-400 hover:text-brand-orange hover:border-brand-orange/30 transition cursor-pointer"
                              title="Editar Agência"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAgencyClick(agency.id, agency.name)}
                              className="p-2 rounded-lg border border-brand-border/40 bg-brand-dark/50 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition cursor-pointer"
                              title="Excluir Agência"
                            >
                              <Trash2 className="w-4 h-4" />
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

          {/* TAB: GEOFENCING / RAIO & GEOLOCALIZAÇÃO */}
          {activeTab === 'geofence' && (
            <div className="flex-1 flex flex-col space-y-5">
              
              {/* Header Info */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-white/60 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-brand-orange" />
                    CONFIGURAÇÃO DE GEOLOCALIZAÇÃO & PERÍMETRO
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Defina o raio geográfico para validar que os participantes estão fisicamente no evento antes de investir.
                  </p>
                </div>
              </div>

              {/* Master Activation Toggle Card */}
              <div className={`p-4 rounded-2xl border transition-all ${
                geoEnabled 
                  ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/20' 
                  : 'bg-brand-surface border-brand-border'
              }`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${geoEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-200">
                        STATUS DO BLOQUEIO POR GEOLOCALIZAÇÃO
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {geoEnabled ? (
                        <span className="text-emerald-300 font-medium">
                          <strong>ATIVADO:</strong> O aplicativo só permite investimentos via QR Code se o participante estiver dentro do raio configurado.
                        </span>
                      ) : (
                        <span className="text-amber-300 font-medium">
                          <strong>DESATIVADO (MODO TESTES):</strong> Investimentos liberados de qualquer localização física. Ideal para homologação e testes remotos.
                        </span>
                      )}
                    </p>
                  </div>

                  <button
                    id="btn-toggle-geofence"
                    type="button"
                    onClick={() => setGeoEnabled(!geoEnabled)}
                    className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      geoEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        geoEnabled ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Section 1: Central Point & Address */}
              <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                  <span className="text-xs font-mono font-bold text-brand-orange uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5" />
                    1. PONTO CENTRAL DO EVENTO
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Coordenadas de Referência</span>
                </div>

                {/* Address Search */}
                <div className="space-y-2">
                  <label htmlFor="geo-address-input" className="text-xs font-mono text-slate-300 font-bold block">
                    Endereço ou Local do Evento:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      id="geo-address-input"
                      type="text"
                      value={geoAddress}
                      onChange={(e) => setGeoAddress(e.target.value)}
                      placeholder="Ex: Pavilhão do Anhembi, Av. Olavo Fontoura, 1209 - São Paulo"
                      className="flex-1 bg-brand-dark border border-brand-border text-slate-100 font-sans text-xs p-3 rounded-xl focus:outline-none focus:border-brand-purple-light"
                    />
                    <button
                      id="btn-search-address"
                      type="button"
                      onClick={handleSearchAddress}
                      disabled={isGeocoding}
                      className="py-2.5 px-4 bg-brand-purple-light hover:bg-brand-purple text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isGeocoding ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Buscando...</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4" />
                          <span>Buscar no Mapa</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Fast GPS Action */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    id="btn-use-current-gps"
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isGettingCurrentLoc}
                    className="w-full py-2.5 bg-brand-dark border border-brand-border hover:border-brand-orange/40 hover:text-brand-orange text-slate-300 text-xs font-mono font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {isGettingCurrentLoc ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-brand-orange" />
                        <span>Capturando GPS do dispositivo...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4 text-brand-orange" />
                        <span>Usar Minha Localização Atual (Estou no local agora)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Latitude & Longitude Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label htmlFor="geo-lat-input" className="text-[11px] font-mono text-slate-400 block font-bold">
                      LATITUDE:
                    </label>
                    <input
                      id="geo-lat-input"
                      type="text"
                      value={geoLat}
                      onChange={(e) => setGeoLat(e.target.value)}
                      placeholder="-23.550520"
                      className="w-full bg-brand-dark border border-brand-border text-slate-100 font-mono text-xs p-2.5 rounded-xl focus:outline-none focus:border-brand-purple-light"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="geo-lng-input" className="text-[11px] font-mono text-slate-400 block font-bold">
                      LONGITUDE:
                    </label>
                    <input
                      id="geo-lng-input"
                      type="text"
                      value={geoLng}
                      onChange={(e) => setGeoLng(e.target.value)}
                      placeholder="-46.633308"
                      className="w-full bg-brand-dark border border-brand-border text-slate-100 font-mono text-xs p-2.5 rounded-xl focus:outline-none focus:border-brand-purple-light"
                    />
                  </div>
                </div>

                {/* OpenStreetMap Quick Preview Link */}
                {geoLat && geoLng && (
                  <div className="pt-1 flex justify-end">
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${geoLat}&mlon=${geoLng}#map=17/${geoLat}/${geoLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono text-brand-orange hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Visualizar Ponto no OpenStreetMap</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Section 2: Radius Configuration */}
              <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                  <span className="text-xs font-mono font-bold text-brand-orange uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    2. RAIO DE ALCANCE DO EVENTO
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40">
                    {formatDistance(geoRadius)}
                  </span>
                </div>

                <div className="space-y-2">
                  <label htmlFor="geo-radius-input" className="text-xs font-mono text-slate-300 font-bold block">
                    Raio de Tolerância em Metros:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="geo-radius-input"
                      type="number"
                      min="10"
                      max="50000"
                      step="10"
                      value={geoRadius}
                      onChange={(e) => setGeoRadius(Math.max(10, parseInt(e.target.value) || 10))}
                      className="w-36 bg-brand-dark border border-brand-border text-slate-100 font-mono font-bold text-sm p-2.5 rounded-xl focus:outline-none focus:border-brand-purple-light"
                    />
                    <span className="text-xs text-slate-400 font-mono">metros a partir do centro</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
                    PRESETS RÁPIDOS:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: '100m (Estande)', val: 100 },
                      { label: '300m (Pavilhão)', val: 300 },
                      { label: '500m (Complexo)', val: 500 },
                      { label: '1.000m (1 km)', val: 1000 },
                      { label: '2.500m (2.5 km)', val: 2500 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setGeoRadius(preset.val)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                          geoRadius === preset.val
                            ? 'bg-brand-orange text-white font-bold'
                            : 'bg-brand-dark border border-brand-border text-slate-300 hover:border-brand-orange/40'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 3: Live Distance Audit Tool for Admin */}
              <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                  <span className="text-xs font-mono font-bold text-brand-orange uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    3. TESTE DE AUDITORIA DE DISTÂNCIA
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Verificação Instantânea</span>
                </div>

                <p className="text-xs text-slate-300">
                  Teste o seu próprio celular ou navegador agora para checar se ele estaria autorizado ou bloqueado pelo raio definido acima.
                </p>

                <button
                  id="btn-test-my-distance"
                  type="button"
                  onClick={handleTestDistance}
                  disabled={isTestingDistance}
                  className="w-full py-2.5 bg-brand-dark border border-brand-border hover:border-brand-purple-light hover:text-white text-slate-200 text-xs font-mono font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {isTestingDistance ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-brand-purple-light" />
                      <span>Calculando distância exata...</span>
                    </>
                  ) : (
                    <>
                      <Compass className="w-4 h-4 text-brand-purple-light" />
                      <span>Calcular Minha Distância Atual do Evento</span>
                    </>
                  )}
                </button>

                {/* Audit Error Box if GPS fails or permission denied */}
                {testDistanceError && (
                  <div className="p-4 rounded-xl border bg-amber-950/30 border-amber-500/40 text-amber-200 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>Diagnóstico de GPS no Dispositivo</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                      {testDistanceError}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      💡 Dica: Se estiver em um computador de mesa ou navegador com localização restrita, você pode testar a regra instantaneamente usando os botões de simulação abaixo.
                    </p>
                  </div>
                )}

                {/* Audit Result Banner */}
                {testDistanceResult && (
                  <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                    testDistanceResult.isInside 
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' 
                      : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                  }`}>
                    {testDistanceResult.isInside ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1.5 text-xs flex-1">
                      <div className="font-bold flex flex-wrap items-center gap-2">
                        <span>Distância: {formatDistance(testDistanceResult.distance)}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                          testDistanceResult.isInside ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {testDistanceResult.isInside ? 'Dentro do Raio (Autorizado)' : 'Fora do Raio (Bloqueado)'}
                        </span>
                        {testDistanceResult.simulated && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-blue-500/20 text-blue-300">
                            Simulação
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] opacity-80 font-sans">
                        {testDistanceResult.isInside
                          ? `Seu dispositivo está a ${formatDistance(testDistanceResult.distance)} do ponto central. Como o raio é de ${formatDistance(geoRadius)}, você consegue investir normalmente.`
                          : `Seu dispositivo está a ${formatDistance(testDistanceResult.distance)} do ponto central, que excede o raio configurado de ${formatDistance(geoRadius)}. Os investimentos via QR Code seriam bloqueados.`}
                      </p>
                      <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-white/10">
                        Coordenadas testadas: Lat {testDistanceResult.lat.toFixed(6)}, Lng {testDistanceResult.lng.toFixed(6)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Simulation Buttons */}
                <div className="pt-2 border-t border-brand-border/40 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
                    SIMULAÇÃO RÁPIDA (PARA TESTES EM COMPUTADOR):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSimulateDistance(Math.min(50, Math.round(geoRadius / 2)))}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 hover:bg-emerald-900/60 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>🎯 Simular Dentro do Evento (~{Math.min(50, Math.round(geoRadius / 2))}m)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSimulateDistance(geoRadius + 800)}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono bg-amber-950/40 border border-amber-800/50 text-amber-300 hover:bg-amber-900/60 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>🚫 Simular Fora do Evento (~{geoRadius + 800}m)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  id="btn-save-geofence"
                  type="button"
                  onClick={handleSaveGeofence}
                  disabled={isSavingGeofence}
                  className="w-full py-4 bg-brand-orange hover:bg-brand-orange-hover font-display font-bold text-sm uppercase tracking-wider text-white rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/20 cursor-pointer transition disabled:opacity-50"
                >
                  {isSavingGeofence ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Salvando no Firestore...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Salvar Configurações de Geolocalização</span>
                    </>
                  )}
                </button>
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
                setSuccessMsg('Toda a base de dados do Expo PP foi limpa com sucesso.');
              }
            }}
            className="w-full py-3 bg-red-950/20 border border-red-900/40 text-red-300 hover:bg-red-950/40 font-mono text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Database className="w-4 h-4 text-red-400" />
            <span>Limpar Base de Dados (Reset)</span>
          </button>
        </div>

      </div>

      {/* QR Code Admin Modal */}
      {selectedAgencyForQr && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 max-w-sm w-full space-y-5 text-center relative shadow-2xl">
            <button
              onClick={() => setSelectedAgencyForQr(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-brand-orange uppercase tracking-wider block">
                QR CODE OFICIAL DO ESTANDE
              </span>
              <h3 className="text-lg font-display font-bold text-slate-100">
                {selectedAgencyForQr.name}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                ID: {selectedAgencyForQr.id}
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner mx-auto">
              <QRCodeSVG 
                value={generateSecureQRPayload(selectedAgencyForQr.id, selectedAgencyForQr.token)} 
                size={180}
                level="H"
              />
            </div>

            <div className="p-3 bg-brand-dark border border-brand-border/60 rounded-xl space-y-1 text-left">
              <span className="text-[10px] font-mono font-bold text-slate-300 block">
                PROTEÇÃO ENCRIPTADA ANTIFRAUDE:
              </span>
              <p className="text-[11px] text-slate-400 leading-snug">
                Este QR Code contém um token proprietário. Não abre links em câmeras comuns, forçando a leitura física pelo aplicativo Expo PP.
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-3 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir para Imprimir/Fixar no Estande</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
