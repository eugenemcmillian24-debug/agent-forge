"use client";
import { createContext, useContext, ReactNode } from "react";
import type { Project } from "@/types/project";

interface WorkspaceCtx {
  project: Project;
}

const WorkspaceContext = createContext<WorkspaceCtx | null>(null);

export function WorkspaceProvider({
  project,
  children,
}: {
  project: Project;
  children: ReactNode;
}) {
  return (
    <WorkspaceContext.Provider value={{ project }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceCtx {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
