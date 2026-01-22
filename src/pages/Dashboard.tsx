import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";

// Components
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ClientStats from "@/components/dashboard/client/ClientStats";
import ClientCampaigns from "@/components/dashboard/client/ClientCampaigns";
import CreateCampaign from "@/components/dashboard/client/CreateCampaign";
import WorkerStats from "@/components/dashboard/worker/WorkerStats";
import TasksList from "@/components/dashboard/worker/TasksList";
import WithdrawalRequest from "@/components/dashboard/worker/WithdrawalRequest";
import NotificationsList from "@/components/dashboard/NotificationsList";

interface ClientStatsData {
  activeCampaigns: number;
  totalSpent: number;
  completedTasks: number;
  pendingTasks: number;
}

interface WorkerStatsData {
  balance: number;
  availableTasks: number;
  completedTasks: number;
  totalEarned: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<"client" | "worker">("client");
  const [activeSection, setActiveSection] = useState("dashboard");

  // Stats
  const [clientStats, setClientStats] = useState<ClientStatsData>({
    activeCampaigns: 0,
    totalSpent: 0,
    completedTasks: 0,
    pendingTasks: 0,
  });
  const [workerStats, setWorkerStats] = useState<WorkerStatsData>({
    balance: 0,
    availableTasks: 0,
    completedTasks: 0,
    totalEarned: 0,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      } else {
        const type = session.user.user_metadata?.user_type || "client";
        setUserType(type);
        loadStats(session.user.id, type);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      } else {
        const type = session.user.user_metadata?.user_type || "client";
        setUserType(type);
        loadStats(session.user.id, type);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadStats = async (userId: string, type: string) => {
    try {
      if (type === "client") {
        // Load client stats
        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("status, price")
          .eq("client_id", userId);

        const activeCampaigns = campaigns?.filter(c => c.status === "active").length || 0;
        const totalSpent = campaigns?.filter(c => ["active", "completed"].includes(c.status))
          .reduce((sum, c) => sum + c.price, 0) || 0;

        // Get completed tasks for client's campaigns
        const campaignIds = campaigns?.map(c => c.status === "active") || [];
        
        setClientStats({
          activeCampaigns,
          totalSpent,
          completedTasks: 0,
          pendingTasks: campaigns?.filter(c => c.status === "pending_payment").length || 0,
        });
      } else {
        // Load worker stats
        const { data: tasks } = await supabase
          .from("tasks")
          .select("status, reward_amount")
          .eq("worker_id", userId);

        const completedTasks = tasks?.filter(t => t.status === "approved").length || 0;
        const totalEarned = tasks?.filter(t => t.status === "approved")
          .reduce((sum, t) => sum + t.reward_amount, 0) || 0;

        // Get pending withdrawals to calculate balance
        const { data: withdrawals } = await supabase
          .from("withdrawals")
          .select("amount, status")
          .eq("worker_id", userId);

        const withdrawnAmount = withdrawals?.filter(w => w.status === "approved")
          .reduce((sum, w) => sum + w.amount, 0) || 0;

        const balance = totalEarned - withdrawnAmount;

        // Get available tasks count
        const { data: availableCampaigns } = await supabase
          .from("available_campaigns_for_workers")
          .select("id")
          .eq("status", "active");

        setWorkerStats({
          balance,
          availableTasks: availableCampaigns?.length || 0,
          completedTasks,
          totalEarned,
        });
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const refreshData = () => {
    if (user) {
      loadStats(user.id, userType);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "Usuário";

  const getSubtitle = () => {
    switch (activeSection) {
      case "criar-campanha": return "Crie uma nova campanha";
      case "tarefas": return "Complete tarefas e ganhe dinheiro";
      case "saques": return "Gerencie seus saques";
      case "notificacoes": return "Suas notificações";
      case "configuracoes": return "Configurações da conta";
      default: return userType === "client" ? "Gerencie suas campanhas" : "Veja suas tarefas disponíveis";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar 
        userType={userType}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <main className="lg:ml-64">
        <DashboardHeader userName={userName} subtitle={getSubtitle()} />

        <div className="p-6">
          {/* Client Dashboard */}
          {userType === "client" && activeSection === "dashboard" && (
            <>
              <ClientStats {...clientStats} />
              <ClientCampaigns 
                user={user} 
                onCreateCampaign={() => setActiveSection("criar-campanha")} 
              />
            </>
          )}

          {userType === "client" && activeSection === "criar-campanha" && (
            <CreateCampaign 
              user={user}
              onComplete={() => {
                setActiveSection("dashboard");
                refreshData();
              }}
              onBack={() => setActiveSection("dashboard")}
            />
          )}

          {/* Worker Dashboard */}
          {userType === "worker" && activeSection === "dashboard" && (
            <>
              <WorkerStats {...workerStats} />
              <TasksList user={user} onTaskComplete={refreshData} />
            </>
          )}

          {userType === "worker" && activeSection === "tarefas" && (
            <TasksList user={user} onTaskComplete={refreshData} />
          )}

          {userType === "worker" && activeSection === "saques" && (
            <WithdrawalRequest 
              user={user} 
              balance={workerStats.balance}
              onWithdrawalComplete={refreshData}
            />
          )}

          {/* Common sections */}
          {activeSection === "notificacoes" && (
            <NotificationsList user={user} />
          )}

          {activeSection === "configuracoes" && (
            <div className="card-elevated p-6">
              <h2 className="font-display font-bold text-lg text-foreground mb-4">
                Configurações
              </h2>
              <p className="text-muted-foreground">
                Em breve você poderá editar seu perfil e preferências aqui.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
