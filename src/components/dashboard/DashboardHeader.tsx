import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import NotificationsList from "@/components/dashboard/NotificationsList";

interface DashboardHeaderProps {
  userName: string;
  subtitle: string;
  userId?: string;
}

const DashboardHeader = ({ userName, subtitle, userId }: DashboardHeaderProps) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-4 lg:pl-6 pl-16">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Olá, {userName}! 👋
          </h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative p-2 rounded-lg hover:bg-muted transition-colors outline-none">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-4 bg-background border-border" align="end">
              <div className="max-h-[80vh] overflow-y-auto p-4 custom-scrollbar">
                {userId && <NotificationsList user={{ id: userId } as any} />}
              </div>
            </PopoverContent>
          </Popover>

          <div className="w-9 h-9 rounded-full bg-gradient-lime flex items-center justify-center">
            <span className="font-semibold text-primary-foreground text-sm">
              {userName[0]?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
