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
  /** Deducts ESPEE and records the purchase. Returns false when funds are short. */
  spend: (amount: number, label: string) => boolean;
  /** Returns ESPEE for a purchase that failed after charging. Never fails. */
  refund: (amount: number, label: string) => void;
  /** Clearly-labeled test grant until real billing lands. */
  grantTestEspee: () => void;
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

  const spend = useCallback(
    (amount: number, label: string) => {
      if (amount <= 0) return true;
      if (balance < amount) return false;
      setBalance(balance - amount);
      setLedger((current) =>
        [{ id: `${Date.now()}`, label, delta: -amount, createdAt: Date.now() }, ...current].slice(
          0,
          50
        )
      );
      return true;
    },
    [balance]
  );

  const refund = useCallback((amount: number, label: string) => {
    if (amount <= 0) return;
    setBalance((current) => current + amount);
    setLedger((current) =>
      [
        { id: `${Date.now()}`, label: `Refund: ${label}`, delta: amount, createdAt: Date.now() },
        ...current,
      ].slice(0, 50)
    );
  }, []);

  const grantTestEspee = useCallback(() => {
    setBalance((current) => current + TEST_GRANT);
    setLedger((current) =>
      [
        { id: `${Date.now()}`, label: 'Test top-up (not real billing)', delta: TEST_GRANT, createdAt: Date.now() },
        ...current,
      ].slice(0, 50)
    );
  }, []);

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
