import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export type Project = {
  id: string;
  toolId: string;
  toolName: string;
  photoUri: string;
  resultUri: string;
  createdAt: number;
};

export type LedgerEntry = {
  id: string;
  label: string;
  /** Negative = spent, positive = granted. */
  delta: number;
  createdAt: number;
};

type EditorContextValue = {
  photoUri: string | null;
  resultUri: string | null;
  intensity: number;
  projects: Project[];
  hydrated: boolean;
  balance: number;
  ledger: LedgerEntry[];
  setPhoto: (uri: string) => void;
  setResult: (uri: string | null) => void;
  setIntensity: (value: number) => void;
  saveProject: (toolId: string, toolName: string) => void;
  openProject: (id: string) => void;
  /**
   * Deducts ESPEE. Server-backed when configured (atomic RPC), local
   * otherwise. Returns false when funds are short or billing is unreachable.
   */
  spend: (amount: number, label: string, refId?: string) => Promise<boolean>;
  /**
   * Returns ESPEE for a purchase that failed after charging. Throws when the
   * refund itself cannot be recorded, so callers can say so honestly.
   */
  refund: (amount: number, label: string, refId?: string) => Promise<void>;
  /** Local-mode test grant. Never offered when the server ledger is live. */
  grantTestEspee: () => void;
  /** Refresh balance + history from the server ledger. No-op in local mode. */
  syncWallet: () => Promise<void>;
  /** Once-daily +2 ESPEE grant. Returns true when coins were actually added. */
  claimDaily: () => Promise<boolean>;
};

const PROJECTS_KEY = 'pixeliia:projects:v1';
const PHOTO_KEY = 'pixeliia:photo:v1';
const WALLET_KEY = 'pixeliia:wallet:v1';
const MAX_PROJECTS = 30;
const WELCOME_GRANT = 5;
const TEST_GRANT = 10;

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [resultUri, setResultUri] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(50);
  const [projects, setProjects] = useState<Project[]>([]);
  const [balance, setBalance] = useState(WELCOME_GRANT);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [storedProjects, storedPhoto, storedWallet] = await Promise.all([
          AsyncStorage.getItem(PROJECTS_KEY),
          AsyncStorage.getItem(PHOTO_KEY),
          AsyncStorage.getItem(WALLET_KEY),
        ]);
        if (cancelled) return;
        if (storedProjects) {
          const parsed = JSON.parse(storedProjects) as Project[];
          if (Array.isArray(parsed)) {
            setProjects(parsed.slice(0, MAX_PROJECTS));
          }
        }
        if (storedPhoto) {
          const parsed = JSON.parse(storedPhoto) as {
            photoUri: string | null;
            resultUri: string | null;
            intensity: number;
          };
          if (parsed?.photoUri) {
            setPhotoUri(parsed.photoUri);
            setResultUri(parsed.resultUri);
            if (typeof parsed.intensity === 'number') {
              setIntensity(parsed.intensity);
            }
          }
        }
        if (storedWallet) {
          const parsed = JSON.parse(storedWallet) as {
            balance: number;
            ledger: LedgerEntry[];
          };
          if (typeof parsed?.balance === 'number') {
            setBalance(parsed.balance);
          }
          if (Array.isArray(parsed?.ledger)) {
            setLedger(parsed.ledger.slice(0, 50));
          }
        } else {
          setLedger([
            {
              id: `welcome-${Date.now()}`,
              label: 'Welcome grant',
              delta: WELCOME_GRANT,
              createdAt: Date.now(),
            },
          ]);
        }
      } catch {
        // Corrupt or unavailable storage: start fresh rather than crash.
      } finally {
        if (!cancelled) {
          hydratedRef.current = true;
          setHydrated(true);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    AsyncStorage.setItem(PHOTO_KEY, JSON.stringify({ photoUri, resultUri, intensity })).catch(
      () => {}
    );
  }, [photoUri, resultUri, intensity]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects.slice(0, MAX_PROJECTS))).catch(
      () => {}
    );
  }, [projects]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    AsyncStorage.setItem(WALLET_KEY, JSON.stringify({ balance, ledger: ledger.slice(0, 50) })).catch(
      () => {}
    );
  }, [balance, ledger]);

  const setPhoto = useCallback((uri: string) => {
    setPhotoUri(uri);
    setResultUri(null);
    setIntensity(50);
  }, []);

  const setResult = useCallback((uri: string | null) => {
    setResultUri(uri);
  }, []);

  const saveProject = useCallback(
    (toolId: string, toolName: string) => {
      if (!photoUri) return;
      const savedUri = resultUri ?? photoUri;
      const entry: Project = {
        id: `${Date.now()}`,
        toolId,
        toolName,
        photoUri,
        resultUri: savedUri,
        createdAt: Date.now(),
      };
      setProjects((current) => [entry, ...current].slice(0, MAX_PROJECTS));
    },
    [photoUri, resultUri]
  );

  const openProject = useCallback(
    (id: string) => {
      const project = projects.find((entry) => entry.id === id);
      if (!project) return;
      setPhotoUri(project.photoUri);
      setResultUri(project.resultUri);
      setIntensity(50);
    },
    [projects]
  );

  const syncWallet = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const sb = getSupabase();
      if (!sb) return;
      await sb.rpc('claim_welcome_grant');
      const [{ data: balanceData }, { data: rows }] = await Promise.all([
        sb.rpc('espee_balance'),
        sb
          .from('espee_ledger')
          .select('id,delta,reason,created_at')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      if (typeof balanceData === 'number') {
        setBalance(balanceData);
      }
      if (Array.isArray(rows)) {
        setLedger(
          (
            rows as {
              id: string;
              delta: number;
              reason: string;
              created_at: string;
            }[]
          ).map((row) => ({
            id: row.id,
            label: row.reason,
            delta: row.delta,
            createdAt: new Date(row.created_at).getTime(),
          }))
        );
      }
    } catch {
      // Offline or backend down: keep last known state.
    }
  }, []);

  const spend = useCallback(
    async (amount: number, label: string, refId?: string) => {
      if (amount <= 0) return true;
      if (!isSupabaseConfigured()) {
        if (balance < amount) return false;
        setBalance(balance - amount);
        setLedger((current) =>
          [{ id: `${Date.now()}`, label, delta: -amount, createdAt: Date.now() }, ...current].slice(
            0,
            50
          )
        );
        return true;
      }
      try {
        const sb = getSupabase();
        if (!sb) return false;
        const { data, error } = await sb.rpc('spend_espee', {
          p_amount: amount,
          p_reason: label,
          p_ref_id: refId ?? null,
        });
        await syncWallet();
        const res = data as { ok: boolean } | null;
        return !error && !!res?.ok;
      } catch {
        return false;
      }
    },
    [balance, syncWallet]
  );

  const refund = useCallback(
    async (amount: number, label: string, refId?: string) => {
      if (amount <= 0) return;
      if (!isSupabaseConfigured()) {
        setBalance((current) => current + amount);
        setLedger((current) =>
          [
            {
              id: `${Date.now()}`,
              label: `Refund: ${label}`,
              delta: amount,
              createdAt: Date.now(),
            },
            ...current,
          ].slice(0, 50)
        );
        return;
      }
      const sb = getSupabase();
      if (!sb) throw new Error('Billing is unreachable right now.');
      const { data, error } = await sb.rpc('refund_espee', {
        p_amount: amount,
        p_reason: label,
        p_ref_id: refId ?? null,
      });
      const res = data as { ok: boolean; error?: string } | null;
      if (error || !res?.ok) {
        throw new Error(res?.error || 'Refund could not be recorded.');
      }
      await syncWallet();
    },
    [syncWallet]
  );

  const grantTestEspee = useCallback(() => {
    setBalance((current) => current + TEST_GRANT);
    setLedger((current) =>
      [
        { id: `${Date.now()}`, label: 'Test top-up (not real billing)', delta: TEST_GRANT, createdAt: Date.now() },
        ...current,
      ].slice(0, 50)
    );
  }, []);

  const claimDaily = useCallback(async () => {
    if (!isSupabaseConfigured()) return false;
    try {
      const sb = getSupabase();
      if (!sb) return false;
      const { data, error } = await sb.rpc('claim_daily_grant');
      await syncWallet();
      const res = data as { ok: boolean } | null;
      return !error && !!res?.ok;
    } catch {
      return false;
    }
  }, [syncWallet]);

  const value = useMemo(
    () => ({
      photoUri,
      resultUri,
      intensity,
      projects,
      hydrated,
      balance,
      ledger,
      setPhoto,
      setResult,
      setIntensity,
      saveProject,
      openProject,
      spend,
      refund,
      grantTestEspee,
      syncWallet,
      claimDaily,
    }),
    [
      photoUri,
      resultUri,
      intensity,
      projects,
      hydrated,
      balance,
      ledger,
      setPhoto,
      setResult,
      saveProject,
      openProject,
      spend,
      refund,
      grantTestEspee,
      syncWallet,
      claimDaily,
    ]
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const value = useContext(EditorContext);
  if (!value) {
    throw new Error('useEditor must be used inside EditorProvider');
  }
  return value;
}
