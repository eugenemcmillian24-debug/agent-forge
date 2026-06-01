"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { Project } from "@/types/project";

interface WorkspaceCtx {
  project: Project;
  setProject: (p: Project) => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  currentRunId: string | null;
  setCurrentRunId: (id: string | null) => void;
  filesVersion: number;
  bumpFilesVersion: () => void;
}

const WorkspaceContext = createContext<WorkspaceCtx | null>(null);

export function WorkspaceProvider({
  project: initialProject,
  children,
}: {
  project: Project;
  children: ReactNode;
}) {
  const [project, setProject]           = useState<Project>(initialProject);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [filesVersion, setFilesVersion] = useState(0);

  const bumpFilesVersion = useCallback(() => {
    setFilesVersion((v) => v + 1);
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        project,
        setProject,
        isGenerating,
        setIsGenerating,
        currentRunId,
        setCurrentRunId,
        filesVersion,
        bumpFilesVersion,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceCtx {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
