/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Visitor, Agency, Transaction, AppState, GeofenceConfig, LocationCheckResult } from '../types';
import { validateCPF } from '../utils/cpf';
import { evaluateGeofence } from '../utils/geolocation';
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
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { hashPassword, verifyPassword, sanitizeInput, chunkArray } from '../utils/security';
import { 
  getDeviceId, 
  getDeviceFingerprint, 
  getDeviceRegisteredCpf, 
  setDeviceRegisteredCpf, 
  clearDeviceRegistration, 
  maskCpf 
} from '../utils/device';

interface AppContextType {
  state: AppState;
  currentPath: string;
  currentParam: string | null;
  navigate: (path: string) => void;
  registerVisitor: (name: string, cpf: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  loginVisitor: (cpf: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  investInAgency: (agencyId: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  addCpfToBlacklist: (cpf: string) => Promise<{ success: boolean; error?: string }>;
  removeCpfFromBlacklist: (cpf: string) => Promise<void>;
  importCpfListToBlacklist: (cpfs: string[]) => Promise<{ success: boolean; importedCount: number }>;
  createAgency: (id: string, token: string, name: string, slogan: string) => Promise<{ success: boolean; error?: string }>;
  updateAgency: (id: string, token: string, name: string, slogan: string) => Promise<{ success: boolean; error?: string }>;
  deleteAgency: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteVisitor: (cpf: string) => Promise<{ success: boolean; error?: string }>;
  deleteTransaction: (transactionId: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  resetAllData: () => Promise<void>;
  fetchAdminData: () => Promise<void>;
  geofenceConfig: GeofenceConfig;
  updateGeofenceConfig: (config: Partial<GeofenceConfig>) => Promise<{ success: boolean; error?: string }>;
  checkLocationPermissionAndGeofence: () => Promise<LocationCheckResult>;
  clearDeviceLock: () => void;
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

export const DEFAULT_GEOFENCE_CONFIG: GeofenceConfig = {
  enabled: false,
  address: 'Expo PP - Centro de Eventos',
  latitude: -23.550520,
  longitude: -46.633308,
  radiusMeters: 300,
};

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
          geofenceConfig: parsed.geofenceConfig || DEFAULT_GEOFENCE_CONFIG,
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
      geofenceConfig: DEFAULT_GEOFENCE_CONFIG,
    };
  });

  // Keep localStorage cache in sync with local state
  useEffect(() => {
    localStorage.setItem('ecos_summit_state', JSON.stringify(state));
    localStorage.setItem('blockedCPFs', JSON.stringify(state.blacklist));
  }, [state]);

  // 1. Real-time Listeners for Public Collections (Agencies and Geofence)
  useEffect(() => {
    // Sync agencies (public leaderboard)
    const unsubscribeAgencies = onSnapshot(collection(db, 'agencies'), (snapshot) => {
      if (snapshot.empty) {
        // Seed DEFAULT_AGENCIES to Firestore
        DEFAULT_AGENCIES.forEach(async (agency) => {
          await setDoc(doc(db, 'agencies', agency.id), agency);
        });
      } else {
        const loadedAgencies: Agency[] = [];
        snapshot.forEach((docSnap) => {
          loadedAgencies.push(docSnap.data() as Agency);
        });
        setState(prev => ({ ...prev, agencies: loadedAgencies }));
      }
    });

    // Sync Geofence Config (public)
    const unsubscribeGeofence = onSnapshot(doc(db, 'config', 'geofence'), (docSnap) => {
      if (docSnap.exists()) {
        const remoteGeofence = docSnap.data() as GeofenceConfig;
        setState(prev => ({ ...prev, geofenceConfig: remoteGeofence }));
      } else {
        setDoc(doc(db, 'config', 'geofence'), DEFAULT_GEOFENCE_CONFIG).catch(err => {
          console.warn('Initial geofence seeding notice:', err);
        });
      }
    });

    return () => {
      unsubscribeAgencies();
      unsubscribeGeofence();
    };
  }, []);

  // 2. Scoped Real-time Listeners for the Authenticated Visitor (Protects against IDOR and Data Leaks)
  const loggedCpf = state.currentVisitor?.cpf || localStorage.getItem('ecos_current_visitor_cpf');
  useEffect(() => {
    if (!loggedCpf) return;

    // Listen ONLY to current visitor's own profile
    const unsubscribeVisitor = onSnapshot(doc(db, 'visitors', loggedCpf), (docSnap) => {
      if (docSnap.exists()) {
        const updatedVisitor = docSnap.data() as Visitor;
        setState(prev => ({ ...prev, currentVisitor: updatedVisitor }));
      } else {
        setState(prev => ({ ...prev, currentVisitor: null }));
        localStorage.removeItem('ecos_current_visitor_cpf');
      }
    });

    // Listen ONLY to current visitor's own transactions
    const qOwnTransactions = query(
      collection(db, 'transactions'),
      where('visitorCpf', '==', loggedCpf)
    );
    const unsubscribeTransactions = onSnapshot(qOwnTransactions, (snapshot) => {
      const loadedTransactions: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        loadedTransactions.push(docSnap.data() as Transaction);
      });
      loadedTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setState(prev => ({ ...prev, transactions: loadedTransactions }));
    });

    return () => {
      unsubscribeVisitor();
      unsubscribeTransactions();
    };
  }, [loggedCpf]);

  // 3. Admin-only data loader (fetches full list only when requested by authenticated admin)
  const fetchAdminData = async () => {
    try {
      const [vSnap, tSnap, bSnap] = await Promise.all([
        getDocs(collection(db, 'visitors')),
        getDocs(collection(db, 'transactions')),
        getDocs(collection(db, 'blacklist'))
      ]);

      const loadedVisitors: Visitor[] = [];
      vSnap.forEach(d => loadedVisitors.push(d.data() as Visitor));

      const loadedTx: Transaction[] = [];
      tSnap.forEach(d => loadedTx.push(d.data() as Transaction));
      loadedTx.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const loadedBlacklist: string[] = [];
      bSnap.forEach(d => loadedBlacklist.push(d.id));

      setState(prev => ({
        ...prev,
        visitors: loadedVisitors,
        transactions: loadedTx,
        blacklist: loadedBlacklist.length > 0 ? loadedBlacklist : prev.blacklist,
      }));
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

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

  // F01: Register a Visitor with Nome, CPF and PIN in Firestore (Anti-IDOR and Anti-Fraud)
  const registerVisitor = async (name: string, cpf: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    const cleanName = sanitizeInput(name, 100);
    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanPin = pin.trim();

    if (!cleanName) {
      return { success: false, error: 'Por favor, informe seu nome completo.' };
    }

    // 1. Validate CPF Mathematically
    if (!validateCPF(cleanCpf) || cleanCpf.length !== 11) {
      return { success: false, error: 'O CPF informado não é válido. Verifique os dígitos.' };
    }

    // 2. Validate PIN (4 to 6 numeric digits)
    if (!/^\d{4,6}$/.test(cleanPin)) {
      return { success: false, error: 'Por favor, crie uma senha/PIN numérico de 4 a 6 dígitos para proteger sua carteira.' };
    }

    // 3. Blacklist Check
    if (state.blacklist.includes(cleanCpf)) {
      return { 
        success: false, 
        error: 'Esse CPF está na lista de bloqueio do evento. Favor procurar a organização.' 
      };
    }

    // 4. Device Lock Check (Regra: Apenas 1 cadastro por dispositivo físico)
    const localBoundCpf = getDeviceRegisteredCpf();
    if (localBoundCpf && localBoundCpf !== cleanCpf) {
      return {
        success: false,
        error: `Este dispositivo já está vinculado ao participante do CPF ${maskCpf(localBoundCpf)}. Para garantir a lisura e integridade do evento, é permitido apenas 1 cadastro por aparelho. Faça login na conta existente.`
      };
    }

    try {
      const deviceId = getDeviceId();
      const deviceFingerprint = await getDeviceFingerprint();

      // Check Firestore device lock by deviceId
      const deviceDocRef = doc(db, 'devices', deviceId);
      const deviceDoc = await getDoc(deviceDocRef);
      if (deviceDoc.exists()) {
        const deviceData = deviceDoc.data();
        if (deviceData.visitorCpf && deviceData.visitorCpf !== cleanCpf) {
          // Store locally to optimize subsequent checks
          setDeviceRegisteredCpf(deviceData.visitorCpf, deviceData.visitorName || '');
          return {
            success: false,
            error: `Este aparelho já realizou o cadastro de outro participante (${maskCpf(deviceData.visitorCpf)}). Para assegurar a transparência das votações, é permitido apenas 1 cadastro por dispositivo. Acesse com a conta já cadastrada.`
          };
        }
      }

      // Check Firestore device lock by fingerprint if fingerprint is non-empty
      if (deviceFingerprint) {
        const fpDocRef = doc(db, 'devices', `fp_${deviceFingerprint}`);
        const fpDoc = await getDoc(fpDocRef);
        if (fpDoc.exists()) {
          const fpData = fpDoc.data();
          if (fpData.visitorCpf && fpData.visitorCpf !== cleanCpf) {
            setDeviceRegisteredCpf(fpData.visitorCpf, fpData.visitorName || '');
            return {
              success: false,
              error: `Este aparelho já realizou o cadastro de outro participante (${maskCpf(fpData.visitorCpf)}). Para assegurar a transparência das votações, é permitido apenas 1 cadastro por dispositivo. Acesse com a conta já cadastrada.`
            };
          }
        }
      }

      // 5. Duplicity Check in Firestore
      const visitorDocRef = doc(db, 'visitors', cleanCpf);
      const visitorDoc = await getDoc(visitorDocRef);
      if (visitorDoc.exists()) {
        // Also bind device to this CPF if not already bound
        setDeviceRegisteredCpf(cleanCpf, (visitorDoc.data() as Visitor).name || cleanName);
        return { 
          success: false, 
          error: 'Esse CPF já foi cadastrado no sistema. Por favor, faça login com sua senha.' 
        };
      }

      // 6. Generate secure password hash
      const passwordHash = await hashPassword(cleanPin);

      // 7. Register and Credit 1000 ECOS
      const newVisitor: Visitor = {
        name: cleanName,
        cpf: cleanCpf,
        balance: 1000, // Automatic Initial Credit: 1,000 ECOS
        passwordHash,
        registeredAt: new Date().toISOString(),
        deviceId,
        deviceFingerprint,
      };

      await setDoc(visitorDocRef, newVisitor);

      // Save device record in Firestore
      const nowIso = new Date().toISOString();
      await setDoc(deviceDocRef, {
        deviceId,
        deviceFingerprint,
        visitorCpf: cleanCpf,
        visitorName: cleanName,
        registeredAt: nowIso,
      });

      if (deviceFingerprint) {
        await setDoc(doc(db, 'devices', `fp_${deviceFingerprint}`), {
          deviceId,
          deviceFingerprint,
          visitorCpf: cleanCpf,
          visitorName: cleanName,
          registeredAt: nowIso,
        });
      }

      // Bind in local device storage
      setDeviceRegisteredCpf(cleanCpf, cleanName);

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

  // F01b: Login a Visitor with CPF and PIN (Anti-IDOR Protection)
  const loginVisitor = async (cpf: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanPin = pin.trim();

    // Validate CPF Mathematically
    if (!validateCPF(cleanCpf) || cleanCpf.length !== 11) {
      return { success: false, error: 'O CPF informado não é válido. Verifique os dígitos.' };
    }

    if (!cleanPin) {
      return { success: false, error: 'Por favor, informe sua senha/PIN de acesso.' };
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

      // Verify Password/PIN
      if (visitorData.passwordHash) {
        const isMatch = await verifyPassword(cleanPin, visitorData.passwordHash);
        if (!isMatch) {
          return { success: false, error: 'Senha/PIN incorreto. Verifique os dígitos informados.' };
        }
      } else {
        // First login for legacy record: register this PIN as their new password
        const passwordHash = await hashPassword(cleanPin);
        await setDoc(visitorDocRef, { passwordHash }, { merge: true });
        visitorData.passwordHash = passwordHash;
      }

      setState(prev => ({
        ...prev,
        currentVisitor: visitorData,
      }));

      // Bind in device storage
      setDeviceRegisteredCpf(cleanCpf, visitorData.name || '');

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

    // Defensive input check: must be positive integer up to 900
    if (!Number.isInteger(amount) || amount <= 0) {
      return { success: false, error: 'Por favor, insira uma quantidade inteira válida de créditos (maior que zero).' };
    }

    // Regra: Limite de até 900 créditos por agência para incentivar a divisão entre agências
    if (amount > 900) {
      return { 
        success: false, 
        error: 'Você só pode investir até 900 créditos em uma agência. Divida seus créditos entre diferentes agências para apoiar mais equipes!' 
      };
    }

    const cleanAgencyId = sanitizeInput(agencyId, 64);
    const visitorCpf = state.currentVisitor.cpf;

    try {
      // Check cumulative investments in this specific agency
      const txQuery = query(
        collection(db, 'transactions'),
        where('visitorCpf', '==', visitorCpf),
        where('agencyId', '==', cleanAgencyId)
      );
      const existingTxSnap = await getDocs(txQuery);
      let alreadyInvestedInAgency = 0;
      existingTxSnap.forEach(dSnap => {
        const dData = dSnap.data();
        if (dData && typeof dData.amount === 'number') {
          alreadyInvestedInAgency += dData.amount;
        }
      });

      if (alreadyInvestedInAgency + amount > 900) {
        const remainingAllowed = Math.max(0, 900 - alreadyInvestedInAgency);
        if (remainingAllowed === 0) {
          return {
            success: false,
            error: 'Você já atingiu o limite máximo de 900 créditos nesta agência. Divida seus créditos restantes investindo em outra agência do evento!'
          };
        }
        return {
          success: false,
          error: `Você só pode investir até 900 créditos em uma mesma agência (já investiu ${alreadyInvestedInAgency} créditos nesta). Você ainda pode investir até ${remainingAllowed} créditos aqui, ou dividir entre outras agências!`
        };
      }

      const visitorDocRef = doc(db, 'visitors', visitorCpf);
      const visitorDoc = await getDoc(visitorDocRef);
      if (!visitorDoc.exists()) {
        return { success: false, error: 'Apoiador não localizado no banco.' };
      }

      const visitorData = visitorDoc.data() as Visitor;

      // Validação de saldo
      if (visitorData.balance < amount) {
        return { success: false, error: `Saldo insuficiente. Seu saldo atual é de ${visitorData.balance} créditos.` };
      }

      // Find agency
      const agencyDocRef = doc(db, 'agencies', cleanAgencyId);
      const agencyDoc = await getDoc(agencyDocRef);
      if (!agencyDoc.exists()) {
        return { success: false, error: 'Agência não encontrada.' };
      }
      const agencyData = agencyDoc.data() as Agency;

      // Create a unique transaction ID
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
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

  // Bulk import CPFs into blacklist with batch chunking (<= 400 per writeBatch)
  const importCpfListToBlacklist = async (cpfs: string[]): Promise<{ success: boolean; importedCount: number }> => {
    const cleanCpfs = cpfs
      .map(c => c.replace(/\D/g, ''))
      .filter(c => c.length === 11);

    if (cleanCpfs.length === 0) {
      return { success: false, importedCount: 0 };
    }

    try {
      // Chunk CPFs into batches of 400 to strictly respect Firestore's 500-operation writeBatch limit
      const batches = chunkArray(cleanCpfs, 400);
      for (const chunk of batches) {
        const batch = writeBatch(db);
        chunk.forEach((cpf) => {
          const docRef = doc(db, 'blacklist', cpf);
          batch.set(docRef, { cpf, blockedAt: new Date().toISOString() });
        });
        await batch.commit();
      }
      return { success: true, importedCount: cleanCpfs.length };
    } catch (err) {
      console.error('Error in bulk import:', err);
      return { success: false, importedCount: 0 };
    }
  };

  // Create a new agency in Firestore with strict input sanitization
  const createAgency = async (id: string, token: string, name: string, slogan: string): Promise<{ success: boolean; error?: string }> => {
    const cleanId = sanitizeInput(id, 64).toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cleanToken = sanitizeInput(token, 64).toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cleanName = sanitizeInput(name, 100);
    const cleanSlogan = sanitizeInput(slogan, 150);

    if (!cleanId || !cleanToken || !cleanName) {
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
        name: cleanName,
        slogan: cleanSlogan,
        balance: 0,
      };

      await setDoc(agencyDocRef, newAgency);
      return { success: true };
    } catch (err: any) {
      console.error('Error in createAgency:', err);
      return { success: false, error: 'Erro ao criar agência no Firestore: ' + err.message };
    }
  };

  // Update an existing agency in Firestore with strict input sanitization
  const updateAgency = async (id: string, token: string, name: string, slogan: string): Promise<{ success: boolean; error?: string }> => {
    const cleanId = sanitizeInput(id, 64).toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cleanToken = sanitizeInput(token, 64).toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cleanName = sanitizeInput(name, 100);
    const cleanSlogan = sanitizeInput(slogan, 150);

    if (!cleanId || !cleanToken || !cleanName) {
      return { success: false, error: 'Por favor, preencha todos os campos corretamente.' };
    }

    try {
      const agencyDocRef = doc(db, 'agencies', cleanId);
      const agencyDoc = await getDoc(agencyDocRef);
      if (!agencyDoc.exists()) {
        return { success: false, error: 'Agência não encontrada para atualização.' };
      }

      const currentData = agencyDoc.data() as Agency;
      const updatedAgency: Agency = {
        ...currentData,
        token: cleanToken,
        name: cleanName,
        slogan: cleanSlogan,
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

  // Delete a visitor/supporter from Firestore and local state (Admin feature)
  const deleteVisitor = async (cpf: string): Promise<{ success: boolean; error?: string }> => {
    const cleanCpf = cpf.replace(/\D/g, '');
    try {
      const visitorDocRef = doc(db, 'visitors', cleanCpf);
      // Delete the visitor document directly in Firestore
      await deleteDoc(visitorDocRef);

      // Best-effort cleanup of any associated devices so the device can be re-used
      try {
        const devicesSnap = await getDocs(query(collection(db, 'devices'), where('visitorCpf', '==', cleanCpf)));
        if (!devicesSnap.empty) {
          const batch = writeBatch(db);
          devicesSnap.forEach(dSnap => {
            batch.delete(dSnap.ref);
          });
          await batch.commit();
        }
      } catch (devErr) {
        console.warn('Non-blocking device cleanup notice:', devErr);
      }

      // If the current logged in visitor was this CPF, clear local session
      if (state.currentVisitor?.cpf?.replace(/\D/g, '') === cleanCpf) {
        localStorage.removeItem('ecos_current_visitor_cpf');
        clearDeviceRegistration();
      }

      // Also clean up local storage state cache
      setState(prev => ({
        ...prev,
        visitors: prev.visitors.filter(v => v.cpf.replace(/\D/g, '') !== cleanCpf),
        currentVisitor: prev.currentVisitor?.cpf?.replace(/\D/g, '') === cleanCpf ? null : prev.currentVisitor
      }));

      return { success: true };
    } catch (err: any) {
      console.error('Error in deleteVisitor:', err);
      return { success: false, error: 'Erro ao excluir apoiador: ' + (err.message || 'Falha de conexão') };
    }
  };

  // Delete/Revert an invested credit transaction (Admin feature)
  // Reversão de crédito: remove a transação, subtrai os créditos da agência e devolve os créditos ao apoiador (se ele ainda existir)
  const deleteTransaction = async (transactionId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const txDocRef = doc(db, 'transactions', transactionId);
      const txDoc = await getDoc(txDocRef);
      if (!txDoc.exists()) {
        return { success: false, error: 'Transação de investimento não encontrada.' };
      }

      const txData = txDoc.data() as Transaction;
      const agencyDocRef = doc(db, 'agencies', txData.agencyId);
      const visitorDocRef = doc(db, 'visitors', txData.visitorCpf);

      await runTransaction(db, async (t) => {
        const agencySnap = await t.get(agencyDocRef);
        const visitorSnap = await t.get(visitorDocRef);

        // Deduct invested credits from agency balance (cannot drop below 0)
        if (agencySnap.exists()) {
          const currentBal = agencySnap.data().balance || 0;
          t.update(agencyDocRef, { balance: Math.max(0, currentBal - txData.amount) });
        }

        // Return credits back to the visitor if visitor account still exists
        if (visitorSnap.exists()) {
          const currentVisitorBal = visitorSnap.data().balance || 0;
          t.update(visitorDocRef, { balance: currentVisitorBal + txData.amount });
        }

        // Delete the transaction document
        t.delete(txDocRef);
      });

      // Update local state immediately
      setState(prev => {
        const updatedAgencies = prev.agencies.map(a => {
          if (a.id === txData.agencyId) {
            return { ...a, balance: Math.max(0, a.balance - txData.amount) };
          }
          return a;
        });

        const updatedVisitors = prev.visitors.map(v => {
          if (v.cpf === txData.visitorCpf) {
            return { ...v, balance: v.balance + txData.amount };
          }
          return v;
        });

        const updatedCurrentVisitor = prev.currentVisitor && prev.currentVisitor.cpf === txData.visitorCpf
          ? { ...prev.currentVisitor, balance: prev.currentVisitor.balance + txData.amount }
          : prev.currentVisitor;

        return {
          ...prev,
          transactions: prev.transactions.filter(tx => tx.id !== transactionId),
          agencies: updatedAgencies,
          visitors: updatedVisitors,
          currentVisitor: updatedCurrentVisitor,
        };
      });

      return { success: true };
    } catch (err: any) {
      console.error('Error in deleteTransaction:', err);
      return { success: false, error: 'Erro ao estornar/excluir investimento: ' + (err.message || 'Falha de transação') };
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

      // Delete all device locks from Firestore
      const devicesQuerySnapshot = await getDocs(collection(db, 'devices'));
      devicesQuerySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      // Write default blacklist back
      DEFAULT_BLACKLIST.forEach((cpf) => {
        const docRef = doc(db, 'blacklist', cpf);
        batch.set(docRef, { cpf, blockedAt: new Date().toISOString() });
      });

      await batch.commit();

      localStorage.removeItem('ecos_current_visitor_cpf');
      clearDeviceRegistration();
      setState({
        currentVisitor: null,
        visitors: [],
        agencies: DEFAULT_AGENCIES.map(a => ({ ...a, balance: 0 })),
        transactions: [],
        blacklist: DEFAULT_BLACKLIST,
        geofenceConfig: state.geofenceConfig,
      });

      navigate('welcome');
    } catch (err) {
      console.error('Error resetting database:', err);
    }
  };

  // Update Geofence Configuration in Firestore
  const updateGeofenceConfig = async (newConfig: Partial<GeofenceConfig>): Promise<{ success: boolean; error?: string }> => {
    try {
      const merged: GeofenceConfig = {
        ...state.geofenceConfig,
        ...newConfig,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'config', 'geofence'), merged, { merge: true });
      setState(prev => ({ ...prev, geofenceConfig: merged }));
      return { success: true };
    } catch (err: any) {
      console.error('Error updating geofence config:', err);
      return { success: false, error: err.message || 'Erro ao salvar configuração' };
    }
  };

  // Check current user location against geofence configuration
  const checkLocationPermissionAndGeofence = async (): Promise<LocationCheckResult> => {
    return await evaluateGeofence(state.geofenceConfig);
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
        deleteVisitor,
        deleteTransaction,
        logout,
        resetAllData,
        fetchAdminData,
        geofenceConfig: state.geofenceConfig,
        updateGeofenceConfig,
        checkLocationPermissionAndGeofence,
        clearDeviceLock: clearDeviceRegistration,
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
