import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useProjects } from "@/hooks/use-construction";
import type { ProjectWithPermission, ProjectPermission } from "@shared/schema";

interface ProjectContextType {
  currentProjectId: number | null;
  setCurrentProjectId: (id: number | null) => void;
  currentProject: ProjectWithPermission | null;
  myPermission: ProjectPermission | null;
  projects: ProjectWithPermission[];
  isLoading: boolean;
  hasNoProjects: boolean;
  canView: (page: string) => boolean;
  canEdit: (page: string) => boolean;
  isOwner: boolean;
  isAdmin: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProjectId, setCurrentProjectIdState] = useState<number | null>(null);
  const { data: projects = [], isLoading: projectsLoading, refetch } = useProjects();

  const setCurrentProjectId = (id: number | null) => {
    setCurrentProjectIdState(id);
    if (id !== null) {
      localStorage.setItem('currentProjectId', String(id));
    }
  };

  useEffect(() => {
    if (projects.length > 0 && currentProjectId === null) {
      const savedId = localStorage.getItem('currentProjectId');
      const savedProject = savedId ? projects.find(p => p.id === Number(savedId)) : null;
      
      if (savedProject) {
        setCurrentProjectIdState(Number(savedId));
      } else {
        localStorage.removeItem('currentProjectId');
        setCurrentProjectIdState(projects[0].id);
      }
    }
  }, [projects, currentProjectId]);

  useEffect(() => {
    if (currentProjectId !== null && projects.length > 0) {
      const projectExists = projects.some(p => p.id === currentProjectId);
      if (!projectExists) {
        localStorage.removeItem('currentProjectId');
        setCurrentProjectIdState(projects[0]?.id || null);
      }
    }
  }, [projects, currentProjectId]);

  const currentProject = projects.find(p => p.id === currentProjectId) || null;
  const myPermission = currentProject?.permission || null;
  const hasNoProjects = !projectsLoading && projects.length === 0;
  
  const isOwner = myPermission?.isOwner ?? false;
  const isAdmin = myPermission?.isAdmin ?? false;

  const canView = (page: string): boolean => {
    if (!myPermission) return false;
    if (isOwner || isAdmin) return true;
    
    switch (page) {
      case 'works': return myPermission.worksView;
      case 'pdc': return myPermission.pdcView;
      case 'budget': return myPermission.budgetView;
      case 'ksp': return myPermission.kspView;
      case 'people': return myPermission.peopleView;
      case 'analytics': return myPermission.analyticsView;
      case 'calendar': return myPermission.calendarView;
      case 'codes': return myPermission.codesView;
      default: return false;
    }
  };

  const canEdit = (page: string): boolean => {
    if (!myPermission) return false;
    if (isOwner || isAdmin) return true;
    
    switch (page) {
      case 'works': return myPermission.worksEdit;
      case 'pdc': return myPermission.pdcEdit;
      case 'budget': return myPermission.budgetEdit;
      case 'ksp': return myPermission.kspEdit;
      case 'people': return myPermission.peopleEdit;
      case 'calendar': return myPermission.calendarEdit;
      case 'codes': return myPermission.codesEdit;
      default: return false;
    }
  };

  return (
    <ProjectContext.Provider value={{
      currentProjectId,
      setCurrentProjectId,
      currentProject,
      myPermission,
      projects,
      isLoading: projectsLoading,
      hasNoProjects,
      canView,
      canEdit,
      isOwner,
      isAdmin
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
