import { useState } from "react";
import { 
  useProjects, 
  useDeletedProjects, 
  useCreateProject, 
  useUpdateProject, 
  useDeleteProject, 
  useRestoreProject, 
  useDuplicateProject 
} from "@/hooks/use-construction";
import { useProjectContext } from "@/contexts/project-context";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  FolderOpen, 
  Plus, 
  MoreVertical, 
  Trash2, 
  Copy, 
  Pencil, 
  RotateCcw,
  Check
} from "lucide-react";
import logoImage from "@assets/Планшет_1767727492095.png";

export function ProjectSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [editingProject, setEditingProject] = useState<{ id: number; name: string } | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const { data: projects = [] } = useProjects();
  const { data: deletedProjects = [] } = useDeletedProjects();
  const { currentProjectId, setCurrentProjectId, currentProject } = useProjectContext();

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const restoreProject = useRestoreProject();
  const duplicateProject = useDuplicateProject();

  const handleSelectProject = (id: number) => {
    setCurrentProjectId(id);
    setIsOpen(false);
  };

  const handleCreateProject = async () => {
    if (newProjectName.trim()) {
      const result = await createProject.mutateAsync(newProjectName.trim());
      setNewProjectName("");
      setShowCreateDialog(false);
      setCurrentProjectId(result.id);
      setIsOpen(false);
    }
  };

  const handleUpdateProject = async () => {
    if (editingProject && editingProject.name.trim()) {
      await updateProject.mutateAsync({ id: editingProject.id, name: editingProject.name.trim() });
      setEditingProject(null);
    }
  };

  const handleDeleteProject = async (id: number) => {
    await deleteProject.mutateAsync(id);
    setShowDeleteConfirm(null);
    if (currentProjectId === id && projects && projects.length > 1) {
      const nextProject = projects.find(p => p.id !== id);
      if (nextProject) setCurrentProjectId(nextProject.id);
    }
  };

  const handleRestoreProject = async (id: number) => {
    await restoreProject.mutateAsync(id);
  };

  const handleDuplicateProject = async (id: number) => {
    const result = await duplicateProject.mutateAsync(id);
    setCurrentProjectId(result.id);
    setIsOpen(false);
  };

  const formatDeleteDate = (date: Date) => {
    const deleteDate = new Date(date);
    const autoDeleteDate = new Date(deleteDate);
    autoDeleteDate.setDate(autoDeleteDate.getDate() + 30);
    const daysLeft = Math.ceil((autoDeleteDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return `${daysLeft} дн.`;
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 hover-elevate rounded-md px-2 py-1 -mx-2 -my-1"
        data-testid="button-project-switcher"
      >
        <img src={logoImage} alt="ПЛАНШЕТ" className="h-9 w-auto" />
        <div className="text-left hidden sm:block">
          <h1 className="text-xl font-bold font-display tracking-tight text-foreground leading-tight">
            ПЛАНШЕТ
          </h1>
          {currentProject && (
            <p className="text-xs text-muted-foreground truncate max-w-[150px]">{currentProject.name}</p>
          )}
        </div>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Проекты</DialogTitle>
            <DialogDescription>Выберите проект или создайте новый</DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <Button 
              variant={showTrash ? "outline" : "default"} 
              size="sm" 
              onClick={() => setShowTrash(false)}
              data-testid="button-active-projects"
            >
              Активные ({projects?.length || 0})
            </Button>
            <Button 
              variant={showTrash ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowTrash(true)}
              data-testid="button-deleted-projects"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Корзина ({deletedProjects.length})
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {showTrash ? (
              deletedProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Корзина пуста
                </div>
              ) : (
                deletedProjects.map(project => (
                  <div 
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-muted-foreground">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Удалится через {formatDeleteDate(project.deletedAt!)}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRestoreProject(project.id)}
                      data-testid={`button-restore-project-${project.id}`}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Восстановить
                    </Button>
                  </div>
                ))
              )
            ) : (
              <>
                {projects?.map(project => (
                  <div 
                    key={project.id}
                    className={`flex items-center justify-between p-3 rounded-md border cursor-pointer hover-elevate ${
                      currentProjectId === project.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border"
                    }`}
                    onClick={() => handleSelectProject(project.id)}
                    data-testid={`project-item-${project.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FolderOpen className="w-5 h-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.permission?.isOwner ? "Владелец" : project.permission?.isAdmin ? "Администратор" : "Участник"}
                        </p>
                      </div>
                      {currentProjectId === project.id && (
                        <Check className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </div>

                    {(project.permission?.isOwner || project.permission?.isAdmin) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" data-testid={`button-project-menu-${project.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setEditingProject({ id: project.id, name: project.name });
                          }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Переименовать
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateProject(project.id);
                          }}>
                            <Copy className="w-4 h-4 mr-2" />
                            Дублировать
                          </DropdownMenuItem>
                          {project.permission?.isOwner && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteConfirm(project.id);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          {!showTrash && (
            <Button 
              className="w-full mt-4" 
              onClick={() => setShowCreateDialog(true)}
              data-testid="button-create-project"
            >
              <Plus className="w-4 h-4 mr-2" />
              Новый проект
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый проект</DialogTitle>
            <DialogDescription>Введите название для нового проекта</DialogDescription>
          </DialogHeader>
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Название проекта"
            onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
            data-testid="input-new-project-name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleCreateProject} 
              disabled={!newProjectName.trim() || createProject.isPending}
              data-testid="button-confirm-create"
            >
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editingProject !== null} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переименовать проект</DialogTitle>
            <DialogDescription>Введите новое название проекта</DialogDescription>
          </DialogHeader>
          <Input
            value={editingProject?.name || ""}
            onChange={(e) => setEditingProject(prev => prev ? { ...prev, name: e.target.value } : null)}
            placeholder="Название проекта"
            onKeyDown={(e) => e.key === "Enter" && handleUpdateProject()}
            data-testid="input-edit-project-name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProject(null)}>
              Отмена
            </Button>
            <Button 
              onClick={handleUpdateProject} 
              disabled={!editingProject?.name.trim() || updateProject.isPending}
              data-testid="button-confirm-rename"
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm !== null} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить проект?</DialogTitle>
            <DialogDescription>
              Проект будет перемещён в корзину на 30 дней, после чего удалится безвозвратно.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Отмена
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => showDeleteConfirm && handleDeleteProject(showDeleteConfirm)}
              disabled={deleteProject.isPending}
              data-testid="button-confirm-delete"
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
