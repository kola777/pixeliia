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

type EditorContextValue = {
  photoUri: string | null;
  resultUri: string | null;
  intensity: number;
  projects: Project[];
  hydrated: boolean;
  setPhoto: (uri: string) => void;
  setResult: (uri: string | null) => void;
  setIntensity: (value: number) => void;
  saveProject: (toolId: string, toolName: string) => void;
  openProject: (id: string) => void;
};

const PROJECTS_KEY = 'pixeliia:projects:v1';
const PHOTO_KEY = 'pixeliia:photo:v1';
const MAX_PROJECTS = 30;

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [resultUri, setResultUri] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(50);
  const [projects, setProjects] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [storedProjects, storedPhoto] = await Promise.all([
          AsyncStorage.getItem(PROJECTS_KEY),
          AsyncStorage.getItem(PHOTO_KEY),
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

  const value = useMemo(
    () => ({
      photoUri,
      resultUri,
      intensity,
      projects,
      hydrated,
      setPhoto,
      setResult,
      setIntensity,
      saveProject,
      openProject,
    }),
    [
      photoUri,
      resultUri,
      intensity,
      projects,
      hydrated,
      setPhoto,
      setResult,
      saveProject,
      openProject,
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
