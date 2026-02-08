import { useState, useRef } from "react";
import { useWorkGroups } from "@/hooks/use-construction";
import { useProjectContext } from "@/contexts/project-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { HardHat, ChevronLeft, Camera, Settings, Check, X, ImagePlus, Trash2, ChevronRight, ChevronLeft as ChevronLeftIcon } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ProjectPhoto } from "@shared/schema";

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export default function Analytics() {
  const { data: groups, isLoading, error } = useWorkGroups();
  const { currentProject, canEdit } = useProjectContext();
  const { toast } = useToast();
  const [isEditingCamera, setIsEditingCamera] = useState(false);
  const [cameraUrlInput, setCameraUrlInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectId = currentProject?.id;

  const { data: photos = [] } = useQuery<ProjectPhoto[]>({
    queryKey: ["/api/projects", projectId, "photos"],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await fetch(`/api/projects/${projectId}/photos`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load photos");
      return res.json();
    },
    enabled: !!projectId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`/api/projects/${projectId}/photos`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Ошибка загрузки" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "photos"] });
      setCurrentPhotoIndex(0);
      toast({ title: "Фото загружено" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (photoId: number) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/photos/${photoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "photos"] });
      setCurrentPhotoIndex(0);
      toast({ title: "Фото удалено" });
    },
    onError: () => {
      toast({ title: "Ошибка удаления фото", variant: "destructive" });
    },
  });

  if (isLoading) return <AnalyticsSkeleton />;
  if (error) return <div className="p-8 text-destructive">Error loading analytics: {error.message}</div>;

  const allWorks = groups?.flatMap(g => g.works || []) || [];
  const overallProgress = allWorks.length > 0 
    ? Math.round(allWorks.reduce((acc, w) => acc + w.progressPercentage, 0) / allWorks.length)
    : 0;

  const overallData = [
    { name: "Выполнено", value: overallProgress },
    { name: "Осталось", value: 100 - overallProgress }
  ];

  const groupProgressData = (groups || []).map(group => {
    const works = group.works || [];
    const completed = works.filter(w => w.progressPercentage === 100).length;
    const avgProgress = works.length > 0 
      ? Math.round(works.reduce((acc, w) => acc + w.progressPercentage, 0) / works.length)
      : 0;
    return {
      name: group.name,
      value: completed,
      total: works.length,
      avgProgress: avgProgress
    };
  });

  const groupWorkCountData = (groups || []).map(group => ({
    name: group.name,
    value: group.works?.length || 0
  }));

  const cameraUrl = currentProject?.cameraUrl;
  const isAdmin = canEdit("analytics");

  const handleStartEditing = () => {
    setCameraUrlInput(cameraUrl || "");
    setIsEditingCamera(true);
  };

  const handleSaveCamera = async () => {
    if (!currentProject) return;
    setIsSaving(true);
    try {
      await apiRequest("PUT", `/api/projects/${currentProject.id}`, {
        cameraUrl: cameraUrlInput.trim() || null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsEditingCamera(false);
      toast({ title: "Ссылка на камеру сохранена" });
    } catch (err) {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEditing = () => {
    setIsEditingCamera(false);
    setCameraUrlInput("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const currentPhoto = photos[currentPhotoIndex];

  return (
    <div className="min-h-screen bg-background/50">
      <header className="bg-card border-b border-border sticky top-0 z-10 backdrop-blur-sm bg-card/80">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="bg-primary text-primary-foreground p-2 rounded-md">
              <HardHat className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold font-display tracking-tight text-foreground">
              Аналитика
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {(cameraUrl || isAdmin) && (
            <Card className="p-4" data-testid="card-camera">
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-base font-semibold text-foreground">Камера объекта</h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {isAdmin && !isEditingCamera && (
                    <Button variant="ghost" size="icon" onClick={handleStartEditing} data-testid="button-edit-camera">
                      <Settings className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {isEditingCamera && (
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Input
                    value={cameraUrlInput}
                    onChange={(e) => setCameraUrlInput(e.target.value)}
                    placeholder="https://fpst.mdrk.ru/account/camera/..."
                    className="flex-1 min-w-[200px]"
                    data-testid="input-camera-url"
                  />
                  <Button size="icon" onClick={handleSaveCamera} disabled={isSaving} data-testid="button-save-camera">
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleCancelEditing} data-testid="button-cancel-camera">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {cameraUrl && !isEditingCamera && (
                <a
                  href={cameraUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square rounded-md bg-muted/50 hover-elevate cursor-pointer overflow-visible"
                  data-testid="link-camera-open"
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="bg-primary/10 p-4 rounded-full mb-3">
                      <Camera className="w-8 h-8 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Нажмите, чтобы открыть трансляцию</span>
                    <span className="text-xs text-muted-foreground mt-1">Откроется в новом окне браузера</span>
                  </div>
                </a>
              )}

              {!cameraUrl && !isEditingCamera && isAdmin && (
                <div className="aspect-square rounded-md bg-muted/30 flex items-center justify-center">
                  <p className="text-muted-foreground text-sm text-center px-4">
                    Камера не настроена. Нажмите на шестерёнку, чтобы добавить ссылку.
                  </p>
                </div>
              )}
            </Card>
          )}

          <Card className="p-4" data-testid="card-photos">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <ImagePlus className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">Фото объекта</h2>
                {photos.length > 0 && (
                  <span className="text-xs text-muted-foreground">({photos.length})</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {isAdmin && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleFileSelect}
                      data-testid="input-photo-upload"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadMutation.isPending}
                      data-testid="button-upload-photo"
                    >
                      <ImagePlus className="w-4 h-4 mr-1" />
                      {uploadMutation.isPending ? "Загрузка..." : "Загрузить"}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="aspect-square rounded-md bg-muted/30 relative overflow-hidden">
              {photos.length > 0 && currentPhoto ? (
                <>
                  <img
                    src={`/uploads/photos/${currentPhoto.filename}`}
                    alt={currentPhoto.originalName}
                    className="w-full h-full object-cover"
                    data-testid="img-current-photo"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {photos.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setCurrentPhotoIndex(Math.max(0, currentPhotoIndex - 1))}
                              disabled={currentPhotoIndex === 0}
                              data-testid="button-photo-prev"
                            >
                              <ChevronLeftIcon className="w-4 h-4 text-white" />
                            </Button>
                            <span className="text-xs text-white/80" data-testid="text-photo-counter">
                              {currentPhotoIndex + 1} / {photos.length}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setCurrentPhotoIndex(Math.min(photos.length - 1, currentPhotoIndex + 1))}
                              disabled={currentPhotoIndex === photos.length - 1}
                              data-testid="button-photo-next"
                            >
                              <ChevronRight className="w-4 h-4 text-white" />
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/70">
                          {currentPhoto.createdAt ? new Date(currentPhoto.createdAt).toLocaleDateString("ru-RU") : ""}
                        </span>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Удалить это фото?")) {
                                deleteMutation.mutate(currentPhoto.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            data-testid="button-delete-photo"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="bg-muted p-4 rounded-full mb-3">
                    <ImagePlus className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {isAdmin ? "Нажмите \"Загрузить\", чтобы добавить фото" : "Фото пока нет"}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6 flex flex-col items-center justify-center">
            <h2 className="text-lg font-bold text-foreground mb-6 w-full text-center">Общий прогресс</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={overallData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#e5e7eb" />
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center">
              <p className="text-3xl font-bold text-primary">{overallProgress}%</p>
              <p className="text-sm text-muted-foreground">выполнено</p>
            </div>
          </Card>

          <Card className="p-6 flex flex-col items-center justify-center">
            <h2 className="text-lg font-bold text-foreground mb-6 w-full text-center">Распределение работ по группам</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={groupWorkCountData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label
                >
                  {groupWorkCountData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {groupProgressData.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-foreground mb-6">Прогресс по группам</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupProgressData.map((group) => (
                <Card key={group.name} className="p-6 flex flex-col items-center justify-center">
                  <h3 className="text-sm font-bold text-foreground mb-4 text-center line-clamp-2">{group.name}</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Завершено", value: group.value },
                          { name: "В процессе", value: group.total - group.value }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ cx, cy, midAngle }) => {
                          const radius = 120;
                          const x = cx + radius * Math.cos((midAngle * Math.PI) / 180);
                          const y = cy + radius * Math.sin((midAngle * Math.PI) / 180);
                          return (
                            <text 
                              x={x} 
                              y={y} 
                              fill="#1f2937" 
                              textAnchor={x > cx ? 'start' : 'end'} 
                              dominantBaseline="central"
                              className="font-bold text-xs"
                            >
                              {group.value}/{group.total}
                            </text>
                          );
                        }}
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#dbeafe" />
                      </Pie>
                      <Pie
                        data={[
                          { name: "Выполнено", value: group.avgProgress },
                          { name: "Осталось", value: 100 - group.avgProgress }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={60}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f0fdf4" />
                      </Pie>
                      <text 
                        x="50%" 
                        y="50%" 
                        textAnchor="middle" 
                        dominantBaseline="central"
                        fontSize="24"
                        fontWeight="bold"
                        fill="#059669"
                      >
                        {group.avgProgress}%
                      </text>
                      <Tooltip formatter={(value) => `${value}${typeof value === 'string' ? '' : '%'}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Завершено работ: {group.value}/{group.total}</p>
                    <p className="text-2xl font-bold text-primary">{group.avgProgress}%</p>
                    <p className="text-xs text-muted-foreground">средний прогресс</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="min-h-screen bg-background/50">
      <header className="bg-card border-b border-border h-16 flex items-center px-6">
        <Skeleton className="w-32 h-8" />
      </header>
      <main className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Skeleton className="aspect-square" />
          <Skeleton className="aspect-square" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Array(2).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </main>
    </div>
  );
}
