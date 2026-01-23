import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  CreditCard, 
  Users, 
  CheckSquare, 
  Wallet,
  TrendingUp,
  AlertTriangle,
  Clock
} from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import StatsCard from "@/components/admin/StatsCard";
import PaymentsTable from "@/components/admin/PaymentsTable";
import TasksTable from "@/components/admin/TasksTable";
import UsersTable from "@/components/admin/UsersTable";
import WithdrawalsTable from "@/components/admin/WithdrawalsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardStats {
  pendingPayments: number;
  pendingTasks: number;
  pendingWithdrawals: number;
  totalUsers: number;
  activeCampaigns: number;
  totalRevenue: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("Admin");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [stats, setStats] = useState<DashboardStats>({
    pendingPayments: 0,
    pendingTasks: 0,
    pendingWithdrawals: 0,
    totalUsers: 0,
    activeCampaigns: 0,
    totalRevenue: 0
  });
  const [pendingCampaigns, setPendingCampaigns] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError || !roleData) {
        toast.error("Acesso negado. Você não tem permissão de administrador.");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      setUserName(session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Admin");
      
      // Load dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error("Error checking admin access:", error);
      toast.error("Erro ao verificar permissões");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Load pending payments (campaigns with pending_payment status)
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("status", "pending_payment")
        .order("created_at", { ascending: false });

      if (!campaignsError && campaignsData) {
        // Fetch client profiles separately
        const clientIds = [...new Set(campaignsData.map(c => c.client_id))];
        const { data: clientProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, phone")
          .in("user_id", clientIds);

        const campaignsWithClients = campaignsData.map(campaign => ({
          ...campaign,
          client: clientProfiles?.find(p => p.user_id === campaign.client_id) || null
        }));
        setPendingCampaigns(campaignsWithClients);
      }

      // Load pending tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "pending_review")
        .order("completed_at", { ascending: false });

      if (!tasksError && tasksData) {
        // Fetch related campaigns and workers
        const campaignIds = [...new Set(tasksData.map(t => t.campaign_id))];
        const workerIds = [...new Set(tasksData.filter(t => t.worker_id).map(t => t.worker_id!))];

        const { data: campaignsInfo } = await supabase
          .from("campaigns")
          .select("id, plan_type, plan_name, platform, page_link")
          .in("id", campaignIds);

        const { data: workerProfiles } = workerIds.length > 0 
          ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", workerIds)
          : { data: [] };

        const tasksWithRelations = tasksData.map(task => ({
          ...task,
          campaign: campaignsInfo?.find(c => c.id === task.campaign_id) || null,
          worker: workerProfiles?.find(p => p.user_id === task.worker_id) || null
        }));
        setPendingTasks(tasksWithRelations);
      }

      // Load all users
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (!usersError && usersData) {
        setUsers(usersData);
      }

      // Load pending withdrawals
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!withdrawalsError && withdrawalsData) {
        // Fetch worker profiles separately
        const workerIds = [...new Set(withdrawalsData.map(w => w.worker_id))];
        const { data: workerProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, phone")
          .in("user_id", workerIds);

        const withdrawalsWithWorkers = withdrawalsData.map(withdrawal => ({
          ...withdrawal,
          worker: workerProfiles?.find(p => p.user_id === withdrawal.worker_id) || null
        }));
        setPendingWithdrawals(withdrawalsWithWorkers);
      }

      // Calculate stats
      const { count: activeCampaignsCount } = await supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      const { data: revenueData } = await supabase
        .from("campaigns")
        .select("price")
        .in("status", ["active", "completed"]);

      const totalRevenue = revenueData?.reduce((sum, c) => sum + c.price, 0) || 0;

      setStats({
        pendingPayments: campaignsData?.length || 0,
        pendingTasks: tasksData?.length || 0,
        pendingWithdrawals: withdrawalsData?.length || 0,
        totalUsers: usersData?.length || 0,
        activeCampaigns: activeCampaignsCount || 0,
        totalRevenue
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate("/");
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-AO", {
      style: "decimal",
      minimumFractionDigits: 0
    }).format(price) + " Kz";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const totalPending = stats.pendingPayments + stats.pendingTasks + stats.pendingWithdrawals;

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar 
        onLogout={handleLogout} 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <main className="lg:ml-64">
        <AdminHeader 
          title="Painel Administrativo" 
          subtitle="Gerencie toda a plataforma"
          userName={userName}
          pendingCount={totalPending}
        />

        <div className="p-6">
          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="Pagamentos Pendentes"
              value={stats.pendingPayments}
              icon={CreditCard}
              variant={stats.pendingPayments > 0 ? "warning" : "default"}
            />
            <StatsCard
              title="Tarefas para Revisar"
              value={stats.pendingTasks}
              icon={CheckSquare}
              variant={stats.pendingTasks > 0 ? "warning" : "default"}
            />
            <StatsCard
              title="Saques Pendentes"
              value={stats.pendingWithdrawals}
              icon={Wallet}
              variant={stats.pendingWithdrawals > 0 ? "warning" : "default"}
            />
            <StatsCard
              title="Total Usuários"
              value={stats.totalUsers}
              icon={Users}
              variant="default"
            />
          </div>

          {/* Secondary Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatsCard
              title="Campanhas Ativas"
              value={stats.activeCampaigns}
              icon={TrendingUp}
              variant="success"
            />
            <StatsCard
              title="Receita Total"
              value={formatPrice(stats.totalRevenue)}
              icon={Wallet}
              variant="success"
            />
            <StatsCard
              title="Ações Pendentes"
              value={totalPending}
              icon={totalPending > 0 ? AlertTriangle : Clock}
              variant={totalPending > 0 ? "danger" : "default"}
            />
          </div>

          {/* Main Content based on active section */}
          {activeSection === "dashboard" && (
            <Tabs defaultValue="payments" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="payments" className="relative">
                  Pagamentos
                  {stats.pendingPayments > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {stats.pendingPayments}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="tasks" className="relative">
                  Tarefas
                  {stats.pendingTasks > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {stats.pendingTasks}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="withdrawals" className="relative">
                  Saques
                  {stats.pendingWithdrawals > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {stats.pendingWithdrawals}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="users">Usuários</TabsTrigger>
              </TabsList>

              <TabsContent value="payments">
                <div className="space-y-4">
                  <h2 className="text-lg font-display font-bold text-foreground">
                    Pagamentos Pendentes de Aprovação
                  </h2>
                  <PaymentsTable 
                    campaigns={pendingCampaigns} 
                    onRefresh={loadDashboardData} 
                  />
                </div>
              </TabsContent>

              <TabsContent value="tasks">
                <div className="space-y-4">
                  <h2 className="text-lg font-display font-bold text-foreground">
                    Tarefas Aguardando Revisão
                  </h2>
                  <TasksTable 
                    tasks={pendingTasks} 
                    onRefresh={loadDashboardData} 
                  />
                </div>
              </TabsContent>

              <TabsContent value="withdrawals">
                <div className="space-y-4">
                  <h2 className="text-lg font-display font-bold text-foreground">
                    Saques Pendentes
                  </h2>
                  <WithdrawalsTable 
                    withdrawals={pendingWithdrawals} 
                    onRefresh={loadDashboardData} 
                  />
                </div>
              </TabsContent>

              <TabsContent value="users">
                <div className="space-y-4">
                  <h2 className="text-lg font-display font-bold text-foreground">
                    Gestão de Usuários
                  </h2>
                  <UsersTable 
                    users={users} 
                    onRefresh={loadDashboardData} 
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}

          {activeSection === "pagamentos" && (
            <div className="space-y-4">
              <h2 className="text-lg font-display font-bold text-foreground">
                Pagamentos Pendentes de Aprovação
              </h2>
              <PaymentsTable 
                campaigns={pendingCampaigns} 
                onRefresh={loadDashboardData} 
              />
            </div>
          )}

          {activeSection === "tarefas" && (
            <div className="space-y-4">
              <h2 className="text-lg font-display font-bold text-foreground">
                Tarefas Aguardando Revisão
              </h2>
              <TasksTable 
                tasks={pendingTasks} 
                onRefresh={loadDashboardData} 
              />
            </div>
          )}

          {activeSection === "usuarios" && (
            <div className="space-y-4">
              <h2 className="text-lg font-display font-bold text-foreground">
                Gestão de Usuários
              </h2>
              <UsersTable 
                users={users} 
                onRefresh={loadDashboardData} 
              />
            </div>
          )}

          {activeSection === "saques" && (
            <div className="space-y-4">
              <h2 className="text-lg font-display font-bold text-foreground">
                Saques Pendentes
              </h2>
              <WithdrawalsTable 
                withdrawals={pendingWithdrawals} 
                onRefresh={loadDashboardData} 
              />
            </div>
          )}

          {activeSection === "antifraude" && (
            <div className="card-elevated p-6">
              <h2 className="text-lg font-display font-bold text-foreground mb-4">
                Sistema Antifraude
              </h2>
              <p className="text-muted-foreground">
                Gerencie dispositivos bloqueados e detecte fraudes.
              </p>
            </div>
          )}

          {activeSection === "notificacoes" && (
            <div className="card-elevated p-6">
              <h2 className="text-lg font-display font-bold text-foreground mb-4">
                Notificações
              </h2>
              <p className="text-muted-foreground">
                Gerencie notificações do sistema.
              </p>
            </div>
          )}

          {activeSection === "registros" && (
            <div className="card-elevated p-6">
              <h2 className="text-lg font-display font-bold text-foreground mb-4">
                Registros
              </h2>
              <p className="text-muted-foreground">
                Visualize logs e atividades do sistema.
              </p>
            </div>
          )}

          {activeSection === "configuracoes" && (
            <div className="card-elevated p-6">
              <h2 className="text-lg font-display font-bold text-foreground mb-4">
                Configurações
              </h2>
              <p className="text-muted-foreground">
                Configure opções do painel administrativo.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Admin;
