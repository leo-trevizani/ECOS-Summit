/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Coins, 
  QrCode, 
  MapPin, 
  Trophy, 
  ShieldCheck, 
  CheckCircle2, 
  HelpCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Store
} from 'lucide-react';

export const GamificationScreen: React.FC = () => {
  const { state, navigate } = useApp();

  const handleStart = () => {
    if (state.currentVisitor) {
      navigate('wallet');
    } else {
      navigate('onboarding');
    }
  };

  const steps = [
    {
      number: '01',
      title: 'Cadastre-se e Receba seus Créditos',
      desc: 'Faça seu login ou cadastro com CPF para autenticar sua participação e receber automaticamente 1.000 créditos na sua carteira digital.',
      icon: Coins,
      highlight: '1.000 créditos de bônus inicial',
      badgeColor: 'from-amber-500/20 to-orange-500/20 text-brand-orange border-brand-orange/30'
    },
    {
      number: '02',
      title: 'Explore os Stands das Agências',
      desc: 'Caminhe pelo pavilhão, converse com os estudantes, assista aos pitches e descubra os projetos criativos e inovadores desenvolvidos pelas agências.',
      icon: Store,
      highlight: 'Avalie as melhores propostas',
      badgeColor: 'from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-500/30'
    },
    {
      number: '03',
      title: 'Escanear QR Code & Validação GPS',
      desc: 'Aponte a câmera do celular para o QR Code oficial de cada stand. Para garantir um evento 100% justo e presencial, o app valida que você está no local do evento no momento do scan.',
      icon: MapPin,
      highlight: 'Validação presencial justa e antifraude',
      badgeColor: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30'
    },
    {
      number: '04',
      title: 'Invista seus Créditos nas Agências',
      desc: 'Decida quantos créditos deseja alocar em cada equipe. Você pode pulverizar seu saldo entre várias agências ou apostar forte na sua favorita!',
      icon: QrCode,
      highlight: 'Você decide quem merece mais aporte',
      badgeColor: 'from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/30'
    },
    {
      number: '05',
      title: 'Acompanhe a Disputa no Ranking',
      desc: 'Todos os investimentos alimentam o ranking em tempo real. Ao final do evento, as agências mais investidas pelo público serão consagradas campeãs da feira.',
      icon: Trophy,
      highlight: 'Premiação das melhores agências da feira',
      badgeColor: 'from-yellow-500/20 to-amber-500/20 text-amber-300 border-yellow-500/30'
    }
  ];

  const faqs = [
    {
      q: 'Os créditos representam dinheiro real?',
      a: 'Não! São créditos virtuais para a gamificação da feira de negócios. Cada visitante recebe uma cota igual de 1.000 créditos para distribuir entre as agências expositoras.'
    },
    {
      q: 'Por que o app pede localização GPS?',
      a: 'Para garantir a lisura da competição, evitando votos remotos ou manipulação. A validação ocorre pontualmente no momento da leitura do QR Code no stand.'
    },
    {
      q: 'Por que meu CPF é solicitado (LGPD)?',
      a: 'O CPF é usado exclusivamente para garantir uma conta única por visitante e impedir que alunos expositores votem em suas próprias agências. Seus dados estão protegidos conforme a LGPD e não são distribuídos a terceiros.'
    },
    {
      q: 'Posso investir mais de uma vez na mesma agência?',
      a: 'Sim! Você pode fazer quantos aportes quiser, desde que possua saldo suficiente de créditos na sua carteira.'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen w-full p-4 sm:p-6 text-white bg-brand-dark relative pb-24 overflow-x-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] right-[-20%] w-[350px] h-[350px] rounded-full bg-brand-purple-light opacity-15 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-20%] w-[300px] h-[300px] rounded-full bg-brand-orange opacity-15 blur-[100px] pointer-events-none" />

      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-3 mb-6 z-10 pt-2">
        <button
          id="btn-back-from-gamification"
          onClick={() => navigate('welcome')}
          className="p-2.5 rounded-full bg-brand-surface border border-brand-border text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center flex-1 pr-10">
          <span className="text-[10px] font-mono text-brand-orange uppercase tracking-widest font-bold">
            EXPO PP • DINÂMICA
          </span>
          <h1 className="text-lg font-display font-bold text-white tracking-tight">
            Como Funciona a Gamificação
          </h1>
        </div>
      </div>

      {/* Hero Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 mb-8 rounded-3xl p-6 bg-gradient-to-br from-brand-surface via-brand-surface/80 to-brand-purple/20 border border-brand-border shadow-xl relative overflow-hidden"
      >
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-brand-orange to-purple-600 text-white shadow-lg shadow-brand-orange/20 shrink-0">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-orange/20 text-brand-orange text-[10px] font-mono font-bold uppercase tracking-wider border border-brand-orange/30">
              <Sparkles className="w-3 h-3" />
              Economia Digital do Evento
            </div>
            <h2 className="text-lg sm:text-xl font-display font-bold text-white leading-tight">
              Você é um Investidor Anjo na Expo PP!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans pt-1">
              Na feira acadêmica, cada visitante se torna um investidor. Você recebe um aporte inicial de créditos para prestigiar, avaliar e ranquear as melhores campanhas e agências publicitárias do evento.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Step by Step Timeline */}
      <div className="z-10 space-y-4 mb-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Passo a Passo da Experiência
          </h3>
          <span className="text-[11px] font-mono text-brand-orange">5 Etapas Simples</span>
        </div>

        {steps.map((step, idx) => {
          const IconComp = step.icon;
          return (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="bg-brand-surface border border-brand-border hover:border-brand-border/80 rounded-2xl p-4 sm:p-5 transition-all shadow-md relative"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-brand-dark border border-brand-border flex items-center justify-center text-xs font-mono font-bold text-brand-orange">
                    {step.number}
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="w-0.5 h-6 bg-brand-border/60 my-1 rounded-full" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-sm sm:text-base font-display font-bold text-slate-100 flex items-center gap-2">
                      {step.title}
                    </h4>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {step.desc}
                  </p>

                  <div className="pt-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border bg-gradient-to-r ${step.badgeColor}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {step.highlight}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="z-10 space-y-4 mb-10">
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="w-4 h-4 text-brand-orange" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Perguntas Frequentes & Dicas
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {faqs.map((faq, i) => (
            <div 
              key={i} 
              className="p-4 rounded-xl bg-brand-surface/70 border border-brand-border/70 space-y-1.5"
            >
              <h5 className="text-xs font-display font-bold text-slate-200">
                {faq.q}
              </h5>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* LGPD & Trust Seal */}
      <div className="z-10 mb-8 p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-emerald-200/90 leading-relaxed font-sans">
          <p className="font-bold text-emerald-300">
            Garantia de Privacidade e Compliance LGPD
          </p>
          <p className="text-[11px] text-emerald-200/70">
            A plataforma respeita integralmente a Lei Geral de Proteção de Dados (Lei 13.709/2018). Seus dados não são monetizados nem repassados a patrocinadores, servindo unicamente para auditoria e transparência do ranking.
          </p>
        </div>
      </div>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-brand-dark via-brand-dark/95 to-transparent z-30 flex justify-center backdrop-blur-xs">
        <button
          onClick={handleStart}
          className="w-full max-w-md py-3.5 px-6 bg-brand-orange hover:bg-brand-orange-hover text-white font-display font-bold text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-brand-orange/25 cursor-pointer transition-all active:scale-[0.99]"
        >
          <span>{state.currentVisitor ? 'Acessar Minha Carteira' : 'Fazer Cadastro & Começar'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
