import { FolderX } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function NoProjects() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <FolderX className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-3" data-testid="text-no-projects-title">
          Вас не добавили ни в один проект
        </h1>
        <p className="text-muted-foreground mb-6" data-testid="text-no-projects-description">
          Обратитесь к администратору для получения доступа к проектам
        </p>
        {user && (
          <p className="text-sm text-muted-foreground mb-4">
            Вы вошли как: <span className="font-medium">{user.username}</span>
          </p>
        )}
        <button
          onClick={() => logout()}
          className="text-sm text-primary hover:underline"
          data-testid="button-logout"
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
