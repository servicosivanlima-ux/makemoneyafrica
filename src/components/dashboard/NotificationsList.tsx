import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Bell, Check, ChevronRight } from "lucide-react";

interface NotificationsListProps {
  user: User;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const NotificationsList = ({ user }: NotificationsListProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  useEffect(() => {
    loadNotifications();

    // Realtime subscription for notifications
    const channel = supabase
      .channel(`notifications-sync-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log("Realtime: Notifications updated, reloading...");
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast.error("Erro ao carregar notificações");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success("Todas notificações marcadas como lidas");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Erro ao marcar notificações");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `Há ${diffMins} minutos`;
    if (diffHours < 24) return `Há ${diffHours} horas`;
    if (diffDays < 7) return `Há ${diffDays} dias`;

    return date.toLocaleDateString("pt-AO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg text-foreground">
          Notificações
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              {unreadCount} nova{unreadCount > 1 ? "s" : ""}
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <Check className="w-4 h-4" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card-elevated p-6 text-center">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-bold text-foreground mb-2">
            Nenhuma notificação
          </h3>
          <p className="text-sm text-muted-foreground">
            Receberá notificações sobre as suas campanhas e tarefas aqui.
          </p>
        </div>
      ) : (
        <div className="card-elevated divide-y divide-border">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 flex items-start gap-3 cursor-pointer transition-colors ${!notification.is_read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!notification.is_read ? "bg-primary/10" : "bg-muted"
                }`}>
                <Bell className={`w-5 h-5 ${!notification.is_read ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className={`font-medium ${!notification.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                    {notification.title}
                  </h4>
                  {!notification.is_read && (
                    <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDate(notification.created_at)}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-3" />
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedNotification(null)}>
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden relative" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground leading-tight mb-1">{selectedNotification.title}</h3>
                  <p className="text-xs text-muted-foreground">{formatDate(selectedNotification.created_at)}</p>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selectedNotification.message}</p>
              </div>

              <div className="flex flex-col gap-3">
                {/* Check if link exists (need to cast or check if property exists if types are not perfectly synced yet) */}
                {(selectedNotification as any).link && (
                  <a
                    href={(selectedNotification as any).link}
                    target={(selectedNotification as any).link.startsWith('http') ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-center hover:brightness-110 transition-all text-sm uppercase tracking-wide flex items-center justify-center gap-2"
                  >
                    Ver Agora <ChevronRight className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="w-full py-3 rounded-lg border border-border text-muted-foreground font-medium hover:bg-muted/50 transition-all text-sm"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsList;
