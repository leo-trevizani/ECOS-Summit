/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Navigation, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  Smartphone, 
  Info, 
  Lock, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { getDevicePosition, checkGeolocationPermission } from '../utils/geolocation';
import { useApp } from '../context/AppContext';

interface GpsPermissionBarrierProps {
  onPermissionGranted: () => void;
}

export const GpsPermissionBarrier: React.FC<GpsPermissionBarrierProps> = ({ onPermissionGranted }) => {
  const { navigate, geofenceConfig } = useApp();
  const [status, setStatus] = useState<'prompt' | 'requesting' | 'denied'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeGuideTab, setActiveGuideTab] = useState<'android' | 'ios' | 'desktop'>('android');

  const handleRequestPermission = async () => {
    setStatus('requesting');
    setErrorMessage(null);

    try {
      // Calling getDevicePosition triggers the browser native permission prompt if not yet decided
      await getDevicePosition();
      setStatus('prompt');
      onPermissionGranted();
    } catch (err: any) {
      if (err && err.code === 1) {
        setStatus('denied');
        setErrorMessage('A permissão de localização foi recusada no navegador.');
      } else if (err && err.code === 2) {
        setStatus('denied');
        setErrorMessage('Sinal de GPS indisponível no dispositivo. Ative o serviço de localização nas configurações do seu celular.');
      } else if (err && err.code === 3) {
        setStatus('denied');
        setErrorMessage('Tempo limite esgotado ao buscar sinal de GPS. Verifique se o GPS está ativo e tente novamente.');
      } else {
        setStatus('denied');
        setErrorMessage(err.message || 'Não foi possível acessar a localização.');
      }
    }
  };

  return (
    <div className="flex flex-col min-h-full flex-1 w-full bg-brand-dark text-white relative p-6 justify-between overflow-y-auto no-scrollbar">
      {/* Background Ambience Glow */}
      <div className="absolute top-[-20%] left-[-20%] w-[350px] h-[350px] rounded-full bg-brand-purple-light/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[300px] h-[300px] rounded-full bg-brand-orange/15 blur-[90px] pointer-events-none" />

      {/* Main Content Card */}
      <div className="max-w-md w-full mx-auto my-auto space-y-6 z-10 py-6">
        
        {/* App Brand Header */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F27D26] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-brand-orange/20">
            <span className="font-display font-black text-xl text-white">E</span>
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-brand-orange uppercase block">
              EXPO PP • EVENTO OFICIAL
            </span>
            <h1 className="text-lg font-display font-bold text-slate-100">Presença Presencial Obrigatória</h1>
          </div>
        </div>

        {/* Central Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-2xl space-y-5"
        >
          {/* Header Icon */}
          <div className="text-center space-y-3">
            <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border shadow-inner ${
              status === 'denied' 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                : 'bg-brand-purple-light/10 border-brand-purple-light/30 text-brand-purple-light'
            }`}>
              {status === 'denied' ? (
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              ) : (
                <Navigation className="w-8 h-8 text-brand-purple-light" />
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-display font-black text-slate-100">
                {status === 'denied' ? 'Acesso ao GPS Necessário' : 'Localização Requerida'}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {status === 'denied'
                  ? 'Você não autorizou o compartilhamento de localização ou o GPS está desligado. Para usar o app, é indispensável permitir o acesso.'
                  : 'Para acessar as funções da Expo PP e apoiar as agências, precisamos confirmar sua presença no evento.'}
              </p>
            </div>
          </div>

          {/* Transparent Education Box */}
          <div className="p-4 bg-brand-dark/70 border border-brand-border/70 rounded-2xl space-y-3 text-xs">
            <div className="flex items-center gap-2 text-brand-orange font-mono font-bold uppercase tracking-wider text-[11px]">
              <ShieldCheck className="w-4 h-4 text-brand-orange shrink-0" />
              <span>Por que solicitamos sua localização?</span>
            </div>

            <ul className="space-y-2 text-slate-300 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold shrink-0">✓</span>
                <span>
                  <strong className="text-slate-100">Votação e Investimento Justos:</strong> O Expo PP premia as agências com base na avaliação dos visitantes presenciais. A localização impede votos remotos ou automatizados.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold shrink-0">✓</span>
                <span>
                  <strong className="text-slate-100">Privacidade Absoluta:</strong> Sua localização NÃO é gravada em histórico, NÃO é monitorada em segundo plano e NUNCA é compartilhada com terceiros.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold shrink-0">✓</span>
                <span>
                  <strong className="text-slate-100">Uso Exclusivo no Evento:</strong> O app verifica apenas se o dispositivo está no raio do evento ({geofenceConfig?.address || 'Pavilhão do Evento'}).
                </span>
              </li>
            </ul>
          </div>

          {/* If Denied: Instruction Guide on How to Re-enable */}
          {status === 'denied' && (
            <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-amber-400 uppercase text-[11px] flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  Como Ativar no Navegador
                </span>
              </div>

              {/* Selector Tabs */}
              <div className="flex bg-brand-dark/90 p-1 rounded-xl border border-brand-border text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('android')}
                  className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                    activeGuideTab === 'android' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Android (Chrome)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('ios')}
                  className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                    activeGuideTab === 'ios' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  iPhone (Safari)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('desktop')}
                  className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                    activeGuideTab === 'desktop' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Computador
                </button>
              </div>

              {/* Guide Contents */}
              <div className="text-slate-300 space-y-1.5 leading-relaxed text-[11px]">
                {activeGuideTab === 'android' && (
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Toque no ícone de <strong>Cadeado 🔒</strong> ou configurações na barra de endereço do Chrome.</li>
                    <li>Toque em <strong>Permissões</strong> &gt; <strong>Localização</strong>.</li>
                    <li>Mude para <strong>Permitir</strong> e clique no botão abaixo.</li>
                  </ol>
                )}
                {activeGuideTab === 'ios' && (
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Toque no botão <strong>aA</strong> ou no cadeado na barra de endereços do Safari.</li>
                    <li>Selecione <strong>Ajustes do Site</strong> &gt; <strong>Localização</strong> &gt; <strong>Permitir</strong>.</li>
                    <li>(Se necessário, verifique se a localização está ligada em Ajustes do iPhone &gt; Privacidade &gt; Serviços de Localização).</li>
                  </ol>
                )}
                {activeGuideTab === 'desktop' && (
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Clique no ícone de cadeado 🔒 ao lado da URL no navegador.</li>
                    <li>Ative a opção <strong>Localização</strong>.</li>
                    <li>Atualize a página ou clique no botão abaixo.</li>
                  </ol>
                )}
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              id="btn-allow-gps"
              onClick={handleRequestPermission}
              disabled={status === 'requesting'}
              className="w-full py-4 bg-brand-orange hover:bg-brand-orange-hover text-white font-display font-bold text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/20 cursor-pointer active:scale-98 transition disabled:opacity-60"
            >
              {status === 'requesting' ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Solicitando Permissão...</span>
                </>
              ) : status === 'denied' ? (
                <>
                  <RefreshCw className="w-5 h-5" />
                  <span>Tentar Novamente / Verificar GPS</span>
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5" />
                  <span>Permitir Acesso à Localização</span>
                </>
              )}
            </button>
          </div>

        </motion.div>

        {/* Discreet Link for Organizers / Admins */}
        <div className="text-center pt-2">
          <button
            onClick={() => navigate('admin')}
            className="text-[11px] font-mono text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            Acesso Restrito: Console Administrativo →
          </button>
        </div>

      </div>
    </div>
  );
};
