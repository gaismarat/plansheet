import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useProjects, useMyProjectPermission } from "@/hooks/use-construction";
import type { ProjectWithPermission, ProjectPermission } from "@shared/schema";

interface ProjectContextType {
  currentProjectId: number | null;
  setCurrentProjectId: (id: number | null) => void;
  currentProject: ProjectWithPermission | null;
  myPermission: ProjectPermission | null;
  projects: ProjectWithPermission[];
  isLoading: boolean;
  hasNoProjects: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: myPermission = null } = useMyProjectPermission(currentProjectId || 0);

  useEffect(() => {
    if (projects.length > 0 && currentProjectId === null) {
      const savedId = localStorage.getItem('currentProjectId');
      const savedProjectExists = savedId && projects.some(p => p.id === Number(savedId));
      
      if (savedProjectExists) {
        setCurrentProjectId(Number(savedId));
      } else {
        setCurrentProjectId(projects[0].id);
      }
    }
  }, [projects, currentProjectId]);

  useEffect(() => {
    if (currentProjectId !== null) {
      localStorage.setItem('currentProjectId', String(currentProjectId));
    }
  }, [currentProjectId]);

  const currentProject = projects.find(p => p.id === currentProjectId) || null;
  const hasNoProjects = !projectsLoading && projects.length === 0;

  return (
    <ProjectContext.Provider value={{
      currentProjectId,
      setCurrentProjectId,
      currentProject,
      myPermission,
      projects,
      isLoading: projectsLoading,
      hasNoProjects
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  return context;
}
