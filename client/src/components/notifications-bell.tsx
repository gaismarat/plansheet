import { useState } from "react";
import { useNotifications, useUnreadNotificationCount, useMarkNotificationsRead } from "@/hooks/use-construction";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell } from "lucide-react";
import { format } from "date-fns";

export function NotificationsBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: notifications = [] } = useNotifications();
  const { data: unreadData } = useUnreadNotificationCount();
  const markRead = useMarkNotificationsRead();

  const unreadCount = unreadData?.count ?? 0;

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      markRead.mutate();
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return format(new Date(date), "dd.MM.yy HH:mm");
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span 
              className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"
              data-testid="notification-indicator"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] h-[300px] p-0 flex flex-col" align="end">
        <div className="p-3 border-b border-border">
          <h3 className="font-semibold text-sm">Уведомления</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Нет уведомлений
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-3 text-sm ${!notification.isRead ? "bg-primary/5" : ""}`}
                  data-testid={`notification-item-${notification.id}`}
                >
                  <p className="text-foreground">{notification.message}</p>
                  {notification.projectName && (
                    <p className="text-xs font-medium text-primary mt-0.5">
                      {notification.projectName}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(notification.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
