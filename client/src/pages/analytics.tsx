import { useWorkGroups } from "@/hooks/use-construction";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { HardHat, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export default function Analytics() {
  const { data: groups, isLoading, error } = useWorkGroups();

  if (isLoading) return <AnalyticsSkeleton />;
  if (error) return <div className="p-8 text-destructive">Error loading analytics: {error.message}</div>;

  // Calculate overall progress
  const allWorks = groups?.flatMap(g => g.works || []) || [];
  const overallProgress = allWorks.length > 0 
    ? Math.round(allWorks.reduce((acc, w) => acc + w.progressPercentage, 0) / allWorks.length)
    : 0;

  // Data for overall pie chart (completed vs pending)
  const overallData = [
    { name: "Выполнено", value: overallProgress },
    { name: "Осталось", value: 100 - overallProgress }
  ];

  // Data for group progress pie chart
  const groupProgressData = (groups || []).map(group => {
    const works = group.works || [];
    const completed = works.filter(w => w.progressPercentage === 100).length;
    return {
      name: group.name,
      value: completed,
      total: works.length
    };
  });

  // Data for overall work count by group
  const groupWorkCountData = (groups || []).map(group => ({
    name: group.name,
    value: group.works?.length || 0
  }));

  return (
    <div className="min-h-screen bg-background/50">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 backdrop-blur-sm bg-card/80">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <HardHat className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold font-display tracking-tight text-foreground">
              Аналитика
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Overall Progress */}
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

          {/* Work Distribution by Group */}
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

        {/* Group Progress Cards */}
        {groupProgressData.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-foreground mb-6">Прогресс по группам</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupProgressData.map((group, index) => (
                <Card key={group.name} className="p-6 flex flex-col items-center justify-center">
                  <h3 className="text-sm font-bold text-foreground mb-4 text-center line-clamp-2">{group.name}</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Завершено", value: group.value },
                          { name: "В процессе", value: group.total - group.value }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#dbeafe" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-center">
                    <p className="text-2xl font-bold text-primary">{group.value}/{group.total}</p>
                    <p className="text-xs text-muted-foreground">завершено/всего</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Array(2).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </main>
    </div>
  );
}
