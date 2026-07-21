/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Visitor, Agency, Transaction, AppState } from '../types';
import { validateCPF } from '../utils/cpf';
import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  writeBatch, 
  runTransaction,
  deleteDoc 
} from 'firebase/firestore';

interface AppContextType {
  state: AppState;
  currentPath: string;
  currentParam: string | null;
  navigate: (path: string) => void;
  registerVisitor: (name: string, cpf: string) => Promise<{ success: boolean; error?: string }>;
  loginVisitor: (cpf: string) => Promise<{ success: boolean; error?: string }>;
  investInAgency: (agencyId: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  addCpfToBlacklist: (cpf: string) => Promise<{ success: boolean; error?: string }>;
  removeCpfFromBlacklist: (cpf: string) => Promise<void>;
  importCpfListToBlacklist: (cpfs: string[]) => Promise<{ success: boolean; importedCount: number }>;
  createAgency: (id: string, token: string, name: string, slogan: string) => Promise<{ success: boolean; error?: string }>;
  updateAgency: (id: string, token: string, name: string, slogan: string) => Promise<{ success: boolean; error?: string }>;
  deleteAgency: (id: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  resetAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial mock data for agencies
const DEFAULT_AGENCIES: Agency[] = [
  {
    id: 'vortex',
    token: 'vortex-summit-2026',
    name: 'Agência Vortex',
    slogan: 'Sinalizando o futuro da comunicação digital e branding imersivo.',
    balance: 0,
  },
  {
    id: 'lumina',
    token: 'lumina-studio-2026',
    name: 'Lumina Studio',
    slogan: 'Brilhando ideias brilhantes em soluções tecnológicas e design UX inovador.',
    balance: 0,
  },
  {
    id: 'apex',
    token: 'apex-growth-2026',
    name: 'Apex Growth',
    slogan: 'Tracionando marcas e escalando receitas através de growth hacking acadêmico.',
    balance: 0,
  },
  {
    id: 'spark',
    token: 'spark-marketing-2026',
    name: 'Spark Marketing',
    slogan: 'A faísca criativa que incendeia seu engajamento nas redes sociais.',
    balance: 0,
  },
];

// Initial blacklisted CPFs (e.g. students and admins)
// Seeding mathematically valid CPFs for mock blacklist
const DEFAULT_BLACKLIST = [
  '98765432100', // Valid CPF used for test blacklist (expositores)
  '12345678909', // Valid CPF used for test blacklist (estudante)
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Parsing initial URL path for deep linking
  const parseUrl = () => {
    // Check hash first (e.g., #/investir/vortex or #/agencia/vortex-summit-2026)
    const hash = window.location.hash;
    const path = window.location.pathname;

    let routeStr = 'welcome';
    let paramStr: string | null = null;

    if (hash && hash.startsWith('#/')) {
      const parts = hash.substring(2).split('/');
      routeStr = parts[0] || 'welcome';
      paramStr = parts[1] || null;
    } else if (path && path !== '/') {
      const parts = path.substring(1).split('/');
      routeStr = parts[0] || 'welcome';
      paramStr = parts[1] || null;
    }

    return { route: routeStr, param: paramStr };
  };

  const initialUrl = parseUrl();
  const [currentPath, setCurrentPath] = useState<string>(initialUrl.route);
  const [currentParam, setCurrentParam] = useState<string | null>(initialUrl.param);
  const [pendingInvestId, setPendingInvestId] = useState<string | null>(
    initialUrl.route === 'investir' ? initialUrl.param : null
  );

  // Load initial local state cache
  const [state, setState] = useState<AppState>(() => {
    const cached = localStorage.getItem('ecos_summit_state');
    const cachedBlocked = localStorage.getItem('blockedCPFs');
    let loadedBlacklist = DEFAULT_BLACKLIST;
    if (cachedBlocked) {
      try {
        const parsedBlocked = JSON.parse(cachedBlocked);
        if (Array.isArray(parsedBlocked)) {
          loadedBlacklist = parsedBlocked;
        }
      } catch (e) {
        console.warn('Error parsing cached blockedCPFs', e);
      }
    }

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return {
          currentVisitor: parsed.currentVisitor || null,
          visitors: parsed.visitors || [],
          agencies: parsed.agencies && parsed.agencies.length > 0 ? parsed.agencies : DEFAULT_AGENCIES,
          transactions: parsed.transactions || [],
          blacklist: parsed.blacklist || loadedBlacklist,
        };
      } catch (e) {
        console.error('Error parsing cached state', e);
      }
    }
    return {
      currentVisitor: null,
      visitors: [],
      agencies: DEFAULT_AGENCIES,
      transactions: [],
      blacklist: loadedBlacklist,
    };
  });

  // Keep localStorage cache in sync with local state
  useEffect(() => {
    localStorage.setItem('ecos_summit_state', JSON.stringify(state));
    localStorage.setItem('blockedCPFs', JSON.stringify(state.blacklist));
  }, [state]);

  // 1. Real-time Listeners for Firestore Collections
  useEffect(() => {
    // Sync agencies
    const unsubscribeAgencies = onSnapshot(collection(db, 'agencies'), (snapshot) => {
      if (snapshot.empty) {
        // Seed DEFAULT_AGENCIES to Firestore
        DEFAULT_AGENCIES.forEach(async (agency) => {
          await setDoc(doc(db, 'agencies', agency.id), agency);
        });
      } else {
        const loadedAgencies: Agency[] = [];
        snapshot.forEach((doc) => {
          loadedAgencies.push(doc.data() as Agency);
        });
        setState(prev => ({ ...prev, agencies: loadedAgencies }));
      }
    });

    // Sync transactions
    const unsubscribeTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      const loadedTransactions: Transaction[] = [];
      snapshot.forEach((doc) => {
        loadedTransactions.push(doc.data() as Transaction);
      });
      // Sort by timestamp desc
      loadedTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setState(prev => ({ ...prev, transactions: loadedTransactions }));
    });

    // Sync visitors
    const unsubscribeVisitors = onSnapshot(collection(db, 'visitors'), (snapshot) => {
      const loadedVisitors: Visitor[] = [];
      snapshot.forEach((doc) => {
        loadedVisitors.push(doc.data() as Visitor);
      });
      setState(prev => ({ ...prev, visitors: loadedVisitors }));
    });

    // Sync blacklist
    const unsubscribeBlacklist = onSnapshot(collection(db, 'blacklist'), (snapshot) => {
      const loadedBlacklist: string[] = [];
      snapshot.forEach((doc) => {
        loadedBlacklist.push(doc.id);
      });
      setState(prev => ({ 
        ...prev, 
        blacklist: loadedBlacklist.length > 0 ? loadedBlacklist : DEFAULT_BLACKLIST 
      }));
    });

    return () => {
      unsubscribeAgencies();
      unsubscribeTransactions();
      unsubscribeVisitors();
      unsubscribeBlacklist();
    };
  }, []);

  // 2. Sync logged-in currentVisitor's balance & details in real-time
  const loggedCpf = state.currentVisitor?.cpf || localStorage.getItem('ecos_current_visitor_cpf');
  useEffect(() => {
    if (!loggedCpf) return;
    
    const unsubscribeVisitor = onSnapshot(doc(db, 'visitors', loggedCpf), (docSnap) => {
      if (docSnap.exists()) {
        const updatedVisitor = docSnap.data() as Visitor;
        setState(prev => {
          if (JSON.stringify(prev.currentVisitor) !== JSON.stringify(updatedVisitor)) {
            return { ...prev, currentVisitor: updatedVisitor };
          }
          return prev;
        });
      } else {
        // If the visitor was deleted or doesn't exist, log them out
        setState(prev => ({ ...prev, currentVisitor: null }));
        localStorage.removeItem('ecos_current_visitor_cpf');
      }
    });

    return () => unsubscribeVisitor();
  }, [loggedCpf]);

  // Sync URL changes with browser routing
  useEffect(() => {
    const handleLocationChange = () => {
      const parsed = parseUrl();
      setCurrentPath(parsed.route);
      setCurrentParam(parsed.param);
      if (parsed.route === 'investir' && parsed.param) {
        setPendingInvestId(parsed.param);
      }
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Update URL on internal navigation
  const navigate = (path: string) => {
    let hashPath = `#/${path}`;
    if (path === 'welcome') hashPath = '#/';
    window.location.hash = hashPath;
    
    const parts = path.split('/');
    setCurrentPath(parts[0]);
    setCurrentParam(parts[1] || null);
  };

  // F01: Register a Visitor with Nome and CPF in Firestore
  const registerVisitor = async (name: string, cpf: string): Promise<{ success: boolean; error?: string }> => {
    const cleanCpf = cpf.replace(/\D/g, '');

    // 1. Validate CPF Mathematically
    if (!validateCPF(cleanCpf)) {
      return { success: false, error: 'O CPF informado não é válido. Verifique os dígitos.' };
    }

    // 2. Blacklist Check
    if (state.blacklist.includes(cleanCpf)) {
      return { 
        success: false, 
        error: 'Esse CPF está na lista de bloqueio do evento. Favor informar outro CPF' 
      };
    }

    try {
      // 3. Duplicity Check in Firestore
      const visitorDocRef = doc(db, 'visitors', cleanCpf);
      const visitorDoc = await getDoc(visitorDocRef);
      if (visitorDoc.exists()) {
        return { 
          success: false, 
          error: 'Esse CPF já foi cadastrado no sistema. Por favor, faça login.' 
        };
      }

      // 4. Register and Credit 1000 ECOS
      const newVisitor: Visitor = {
        name: name.trim(),
        cpf: cleanCpf,
        balance: 1000, // Automatic Initial Credit: 1,000 ECOS
        registeredAt: new Date().toISOString(),
      };

      await setDoc(visitorDocRef, newVisitor);

      setState(prev => ({
        ...prev,
        currentVisitor: newVisitor,
      }));

      localStorage.setItem('ecos_current_visitor_cpf', cleanCpf);

      // Check deep linking pending state
      if (pendingInvestId) {
        navigate(`investir/${pendingInvestId}`);
        setPendingInvestId(null);
      } else {
        navigate('wallet');
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error in registerVisitor:', err);
      return { success: false, error: 'Erro ao conectar com Firestore: ' + err.message };
    }
  };

  // F01b: Login a Visitor with CPF
  const loginVisitor = async (cpf: string): Promise<{ success: boolean; error?: string }> => {
    const cleanCpf = cpf.replace(/\D/g, '');

    // Validate CPF Mathematically
    if (!validateCPF(cleanCpf)) {
      return { success: false, error: 'O CPF informado não é válido. Verifique os dígitos.' };
    }

    // Blacklist Check
    if (state.blacklist.includes(cleanCpf)) {
      return { 
        success: false, 
        error: 'Esse CPF está na lista de bloqueio do evento.' 
      };
    }

    try {
      const visitorDocRef = doc(db, 'visitors', cleanCpf);
      const visitorDoc = await getDoc(visitorDocRef);
      
      if (!visitorDoc.exists()) {
        return { 
          success: false, 
          error: 'CPF não cadastrado. Caso seja a primeira vez, faça o cadastro.' 
        };
      }

      const visitorData = visitorDoc.data() as Visitor;

      setState(prev => ({
        ...prev,
        currentVisitor: visitorData,
      }));

      localStorage.setItem('ecos_current_visitor_cpf', cleanCpf);

      // Check deep linking pending state
      if (pendingInvestId) {
        navigate(`investir/${pendingInvestId}`);
        setPendingInvestId(null);
      } else {
        navigate('wallet');
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error in loginVisitor:', err);
      return { success: false, error: 'Erro ao conectar com Firestore: ' + err.message };
    }
  };

  // F02: Transação e Registro (The Market Pitch) utilizing atomic transactions
  const investInAgency = async (agencyId: string, amount: number): Promise<{ success: boolean; error?: string }> => {
    if (!state.currentVisitor) {
      return { success: false, error: 'Sessão inválida. Faça login novamente.' };
    }

    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Por favor, insira um valor válido de créditos.' };
    }

    try {
      const visitorDocRef = doc(db, 'visitors', state.currentVisitor.cpf);
      const visitorDoc = await getDoc(visitorDocRef);
      if (!visitorDoc.exists()) {
        return { success: false, error: 'Apoiador não localizado no banco.' };
      }

      const visitorData = visitorDoc.data() as Visitor;

      // Validação de saldo
      if (visitorData.balance < amount) {
        return { success: false, error: `Saldo insuficiente. Seu saldo atual é de ${visitorData.balance} ECOS.` };
      }

      // Find agency
      const agencyDocRef = doc(db, 'agencies', agencyId);
      const agencyDoc = await getDoc(agencyDocRef);
      if (!agencyDoc.exists()) {
        return { success: false, error: 'Agência não encontrada.' };
      }
      const agencyData = agencyDoc.data() as Agency;

      // Create a unique transaction ID
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newTx: Transaction = {
        id: transactionId,
        visitorCpf: visitorData.cpf,
        visitorName: visitorData.name,
        agencyId: agencyData.id,
        agencyName: agencyData.name,
        amount: amount,
        timestamp: new Date().toISOString(),
      };

      // Atomic multi-document Firestore transaction
      await runTransaction(db, async (transaction) => {
        const vDoc = await transaction.get(visitorDocRef);
        const aDoc = await transaction.get(agencyDocRef);

        if (!vDoc.exists() || !aDoc.exists()) {
          throw new Error('Agência ou Apoiador inválido.');
        }

        const currentVBal = vDoc.data().balance;
        const currentABal = aDoc.data().balance;

        if (currentVBal < amount) {
          throw new Error('Saldo insuficiente para realizar a transação.');
        }

        // 1. Update visitor balance
        transaction.update(visitorDocRef, { balance: currentVBal - amount });

        // 2. Update agency balance
        transaction.update(agencyDocRef, { balance: currentABal + amount });

        // 3. Record transaction
        transaction.set(doc(db, 'transactions', transactionId), newTx);
      });

      return { success: true };
    } catch (err: any) {
      console.error('Error in investInAgency transaction:', err);
      return { success: false, error: err.message || 'Erro ao processar transação no Firestore.' };
    }
  };

  // Add a CPF to the blocked list (Admin feature)
  const addCpfToBlacklist = async (cpf: string): Promise<{ success: boolean; error?: string }> => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return { success: false, error: 'CPF deve conter 11 dígitos numéricos.' };
    }
    if (state.blacklist.includes(cleanCpf)) {
      return { success: false, error: 'Este CPF já está na lista de bloqueados.' };
    }

    try {
      await setDoc(doc(db, 'blacklist', cleanCpf), { cpf: cleanCpf, blockedAt: new Date().toISOString() });
      return { success: true };
    } catch (err: any) {
      console.error('Error adding to blacklist:', err);
      return { success: false, error: err.message || 'Erro ao salvar.' };
    }
  };

  // Remove CPF from blocked list
  const removeCpfFromBlacklist = async (cpf: string): Promise<void> => {
    const cleanCpf = cpf.replace(/\D/g, '');
    try {
      await deleteDoc(doc(db, 'blacklist', cleanCpf));
    } catch (err) {
      console.error('Error removing from blacklist:', err);
    }
  };

  // Bulk import CPFs into blacklist
  const importCpfListToBlacklist = async (cpfs: string[]): Promise<{ success: boolean; importedCount: number }> => {
    const cleanCpfs = cpfs
      .map(c => c.replace(/\D/g, ''))
      .filter(c => c.length === 11);

    if (cleanCpfs.length === 0) {
      return { success: false, importedCount: 0 };
    }

    try {
      const batch = writeBatch(db);
      cleanCpfs.forEach((cpf) => {
        const docRef = doc(db, 'blacklist', cpf);
        batch.set(docRef, { cpf, blockedAt: new Date().toISOString() });
      });
      await batch.commit();
      return { success: true, importedCount: cleanCpfs.length };
    } catch (err) {
      console.error('Error in bulk import:', err);
      return { success: false, importedCount: 0 };
    }
  };

  // Create a new agency in Firestore
  const createAgency = async (id: string, token: string, name: string, slogan: string): Promise<{ success: boolean; error?: string }> => {
    const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cleanToken = token.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

    if (!cleanId || !cleanToken || !name.trim()) {
      return { success: false, error: 'Por favor, preencha todos os campos corretamente.' };
    }

    try {
      // Check if id already exists in Firestore
      const agencyDocRef = doc(db, 'agencies', cleanId);
      const agencyDoc = await getDoc(agencyDocRef);
      if (agencyDoc.exists()) {
        return { success: false, error: `Já existe uma agência com o ID "${cleanId}".` };
      }

      const newAgency: Agency = {
        id: cleanId,
        token: cleanToken,
        name: name.trim(),
        slogan: slogan.trim(),
        balance: 0,
      };

      await setDoc(agencyDocRef, newAgency);
      return { success: true };
    } catch (err: any) {
      console.error('Error in createAgency:', err);
      return { success: false, error: 'Erro ao criar agência no Firestore: ' + err.message };
    }
  };

  // Update an existing agency in Firestore
  const updateAgency = async (id: string, token: string, name: string, slogan: string): Promise<{ success: boolean; error?: string }> => {
    if (!id.trim() || !token.trim() || !name.trim()) {
      return { success: false, error: 'Por favor, preencha todos os campos corretamente.' };
    }

    try {
      const agencyDocRef = doc(db, 'agencies', id);
      const agencyDoc = await getDoc(agencyDocRef);
      if (!agencyDoc.exists()) {
        return { success: false, error: 'Agência não encontrada para atualização.' };
      }

      const currentData = agencyDoc.data() as Agency;
      const updatedAgency: Agency = {
        ...currentData,
        token: token.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''),
        name: name.trim(),
        slogan: slogan.trim(),
      };

      await setDoc(agencyDocRef, updatedAgency);
      return { success: true };
    } catch (err: any) {
      console.error('Error in updateAgency:', err);
      return { success: false, error: 'Erro ao atualizar agência no Firestore: ' + err.message };
    }
  };

  // Delete an existing agency in Firestore
  const deleteAgency = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const agencyDocRef = doc(db, 'agencies', id);
      const agencyDoc = await getDoc(agencyDocRef);
      if (!agencyDoc.exists()) {
        return { success: false, error: 'Agência não encontrada.' };
      }

      await deleteDoc(agencyDocRef);
      return { success: true };
    } catch (err: any) {
      console.error('Error in deleteAgency:', err);
      return { success: false, error: 'Erro ao deletar agência no Firestore: ' + err.message };
    }
  };

  // Logout current visitor
  const logout = () => {
    localStorage.removeItem('ecos_current_visitor_cpf');
    setState(prev => ({
      ...prev,
      currentVisitor: null,
    }));
    navigate('welcome');
  };

  // Reset entire database to defaults for presentation / debugging
  const resetAllData = async (): Promise<void> => {
    try {
      const batch = writeBatch(db);

      // Reset agencies to 0 balance
      state.agencies.forEach((agency) => {
        const docRef = doc(db, 'agencies', agency.id);
        batch.set(docRef, { ...agency, balance: 0 });
      });

      // Delete all transactions from Firestore
      const txQuerySnapshot = await getDocs(collection(db, 'transactions'));
      txQuerySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      // Delete all visitors from Firestore
      const visitorsQuerySnapshot = await getDocs(collection(db, 'visitors'));
      visitorsQuerySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      // Delete all blacklist items from Firestore
      const blacklistQuerySnapshot = await getDocs(collection(db, 'blacklist'));
      blacklistQuerySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      // Write default blacklist back
      DEFAULT_BLACKLIST.forEach((cpf) => {
        const docRef = doc(db, 'blacklist', cpf);
        batch.set(docRef, { cpf, blockedAt: new Date().toISOString() });
      });

      await batch.commit();

      localStorage.removeItem('ecos_current_visitor_cpf');
      setState({
        currentVisitor: null,
        visitors: [],
        agencies: DEFAULT_AGENCIES.map(a => ({ ...a, balance: 0 })),
        transactions: [],
        blacklist: DEFAULT_BLACKLIST,
      });

      navigate('welcome');
    } catch (err) {
      console.error('Error resetting database:', err);
    }
  };

  return (
    <AppContext.Provider
      value={{
        state,
        currentPath,
        currentParam,
        navigate,
        registerVisitor,
        loginVisitor,
        investInAgency,
        addCpfToBlacklist,
        removeCpfFromBlacklist,
        importCpfListToBlacklist,
        createAgency,
        updateAgency,
        deleteAgency,
        logout,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
