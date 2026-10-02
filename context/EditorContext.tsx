import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

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
  setPhoto: (uri: string) => void;
  setResult: (uri: string | null) => void;
  setIntensity: (value: number) => void;
  saveProject: (toolId: string, toolName: string) => void;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [resultUri, setResultUri] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(50);
  const [projects, setProjects] = useState<Project[]>([]);

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
      setProjects((current) => [
        {
          id: `${Date.now()}`,
          toolId,
          toolName,
          photoUri,
          resultUri: savedUri,
          createdAt: Date.now(),
        },
        ...current,
      ]);
    },
    [photoUri, resultUri]
  );

  const value = useMemo(
    () => ({
      photoUri,
      resultUri,
      intensity,
      projects,
      setPhoto,
      setResult,
      setIntensity,
      saveProject,
    }),
    [photoUri, resultUri, intensity, projects, setPhoto, setResult, saveProject]
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
