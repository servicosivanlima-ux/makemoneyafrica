import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import {
  CreditCard,
  Users,
  CheckSquare,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Clock,
  Trash2,
  Shield,
  Bell,
  FileText,
  Settings,
  PlusCircle,
  MessageSquare,
  UserPlus,
  Youtube
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import StatsCard from "@/components/admin/StatsCard";
import PaymentsTable from "@/components/admin/PaymentsTable";
import TasksTable from "@/components/admin/TasksTable";
import UsersTable from "@/components/admin/UsersTable";
import WithdrawalsTable from "@/components/admin/WithdrawalsTable";
import DepositsTable from "@/components/admin/DepositsTable";
import CampaignsTable from "@/components/admin/CampaignsTable";
import NotificationsManager from "@/components/admin/NotificationsManager";
import KycTable from "@/components/admin/KycTable";
import ChatModeration from "@/components/admin/ChatModeration";
import WorkerChat from "@/components/dashboard/worker/WorkerChat";
import ReferralsManager from "@/components/admin/ReferralsManager";
import UserActivityReport from "@/components/admin/UserActivityReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardStats {
  pendingPayments: number;
  pendingTasks: number;
  pendingWithdrawals: number;
  totalUsers: number;
  activeCampaigns: number;
  totalRevenue: number;
  pendingDeposits: number;
  pendingKyc: number;
  pendingYoutube: number;
  totalReferrals: number;
  totalCommissionsPaid: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userName, setUserName] = useState("Admin");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    pendingPayments: 0,
    pendingTasks: 0,
    pendingWithdrawals: 0,
    totalUsers: 0,
    activeCampaigns: 0,
    totalRevenue: 0,
    pendingDeposits: 0,
    pendingKyc: 0,
    pendingYoutube: 0,
    totalReferrals: 0,
    totalCommissionsPaid: 0
  });
  const [pendingCampaigns, setPendingCampaigns] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [pendingKyc, setPendingKyc] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAccess();

    // Subscribe to all operational tables to keep the Admin dashboard in sync
    const tables = ["campaigns", "tasks", "withdrawals", "deposits", "kyc_documents", "profiles"];
    const channels = tables.map(table => {
      return supabase
        .channel(`admin-sync-${table}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: table },
          () => {
            loadDashboardData();
          }
        )
        .subscribe();
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
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

      if (!session.user.email_confirmed_at) {
        toast.error("Por favor, confirme seu e-mail para acessar o painel administrativo.");
        navigate("/auth");
        return;
      }

      setIsAdmin(true);
      setUser(session.user);
      setUserName(session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Admin");

      // Fetch admin profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      setProfile(profileData);

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
    let campaignsCount = 0;
    let tasksCount = 0;
    let withdrawalsCount = 0;
    let usersCount = 0;
    let youtubeCount = 0;
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
          .select("user_id, full_name, email, phone, country")
          .in("user_id", clientIds);

        const campaignsWithClients = campaignsData.map(campaign => ({
          ...campaign,
          client: clientProfiles?.find(p => p.user_id === campaign.client_id) || null
        }));
        setPendingCampaigns(campaignsWithClients);
        campaignsCount = campaignsWithClients.length;
      } else if (campaignsError) {
        console.error("Error loading campaigns:", campaignsError);
        toast.error("Erro ao carregar campanhas: " + campaignsError.message);
      }
    } catch (err: any) {
      console.error("Critical error loading campaigns:", err);
    }

    try {
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
          ? await supabase.from("profiles").select("user_id, full_name, email, country, facebook_link, instagram_link, tiktok_link, youtube_link").in("user_id", workerIds)
          : { data: [] };

        const tasksWithRelations = tasksData.map(task => ({
          ...task,
          campaign: campaignsInfo?.find(c => c.id === task.campaign_id) || null,
          worker: workerProfiles?.find(p => p.user_id === task.worker_id) || null
        }));
        setPendingTasks(tasksWithRelations);
        tasksCount = tasksWithRelations.length;
      } else if (tasksError) {
        console.error("Error loading tasks:", tasksError);
        toast.error("Erro ao carregar tarefas: " + tasksError.message);
      }
    } catch (err: any) {
      console.error("Critical error loading tasks:", err);
    }

    try {
      // Load all users (excluding admins from the general list)
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .neq("user_type", "admin")
        .order("created_at", { ascending: false });

      if (!usersError && usersData) {
        setUsers(usersData);
        usersCount = usersData.length;
      }
    } catch (err: any) {
      console.error("Critical error loading users:", err);
    }

    try {
      // Load pending withdrawals
      console.log("Fetching pending withdrawals...");
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (withdrawalsError) {
        console.error("Error loading withdrawals:", withdrawalsError);
        toast.error("Erro ao carregar saques: " + withdrawalsError.message);
      } else if (withdrawalsData) {
        console.log(`Found ${withdrawalsData.length} pending withdrawals`);
        // Fetch worker profiles separately
        const workerIds = [...new Set(withdrawalsData.map(w => w.worker_id))];

        const { data: workerProfiles, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, phone, country, user_type, account_type")
          .in("user_id", workerIds);

        if (profilesError) {
          console.error("Error loading worker profiles for withdrawals:", profilesError);
        }

        const withdrawalsWithWorkers = withdrawalsData.map(withdrawal => ({
          ...withdrawal,
          worker: workerProfiles?.find(p => p.user_id === withdrawal.worker_id) || null
        }));
        setPendingWithdrawals(withdrawalsWithWorkers);
        withdrawalsCount = withdrawalsWithWorkers.length;
        console.log("Withdrawals with workers processed:", withdrawalsWithWorkers);
      }
    } catch (err: any) {
      console.error("Critical error loading withdrawals:", err);
    }

    try {
      // Load pending youtube setup
      const { count: pendingYoutubeCount } = await supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_admin_setup");

      youtubeCount = pendingYoutubeCount || 0;
    } catch (err) {
      console.error("Error loading pending youtube:", err);
    }

    try {
      // Calculate stats
      const { count: activeCampaignsCount } = await supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Fetch referral stats
      const { data: referralStatsData } = await (supabase.rpc as any)("get_referral_stats");

      // Calculate revenue (previous logic was simplified, let's keep it but enhance it)
      const { data: revenueData } = await supabase
        .from("campaigns")
        .select("price")
        .in("status", ["active", "completed"]);

      const totalRevenue = revenueData?.reduce((sum, c) => sum + c.price, 0) || 0;

      // New: Fetch total approved deposits data
      const { data: depositsData } = await (supabase
        .from("deposits" as any)
        .select("amount")
        .eq("status", "approved") as any);

      const totalDepositsValue = depositsData?.reduce((sum, d) => sum + d.amount, 0) || 0;

      // Calculate task costs (paid to workers)
      const { data: taskCostsData } = await supabase
        .from("tasks")
        .select("reward_amount")
        .eq("status", "approved");

      const totalTaskCosts = taskCostsData?.reduce((sum, t) => sum + t.reward_amount, 0) || 0;

      // Financial health logic...
      // Let's use Total Approved Deposits - Total Task Costs - Total Commissions Paid
      // Manual adjustment: Subtract 6000 Kz from removed campaign that still has deposit record
      const manualCorrection = 6000;
      const totalCommissions = referralStatsData?.total_commissions_paid || 0;
      const finalRevenue = totalDepositsValue - totalTaskCosts - manualCorrection - totalCommissions;

      const { count: pendingDepositsCount } = await supabase
        .from("deposits" as any)
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Load pending KYC
      const { data: kycData, error: kycError } = await (supabase
        .from("kyc_documents" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);

      if (!kycError && kycData) {
        // Fetch profiles for the workers
        const userIds = [...new Set((kycData as any[]).map(k => k.user_id as string))] as string[];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);

        const kycWithProfiles = kycData.map(kyc => ({
          ...kyc,
          profile: profilesData?.find(p => p.user_id === kyc.user_id) || null
        }));
        setPendingKyc(kycWithProfiles);
      }

      setStats({
        pendingPayments: campaignsCount,
        pendingTasks: tasksCount,
        pendingWithdrawals: withdrawalsCount,
        totalUsers: usersCount,
        activeCampaigns: activeCampaignsCount || 0,
        totalRevenue: Math.max(0, finalRevenue),
        pendingDeposits: pendingDepositsCount || 0,
        pendingKyc: (kycData as any[])?.filter((k: any) => k.status === 'pending').length || 0,
        pendingYoutube: youtubeCount,
        totalReferrals: referralStatsData?.total_referrals || 0,
        totalCommissionsPaid: totalCommissions
      });
    } catch (err: any) {
      console.error("Error calculating dashboard stats:", err);
    }
  };

  const handleResetSystem = async () => {
    const confirmed = window.confirm(
      "TEM A CERTEZA? Esta acção irá apagar TODAS as informações transacionais do sistema (campanhas, tarefas, pagamentos, saques, depósitos, mensagens de chat, etc.) e repor todos os saldos a zero. As contas de utilizadores e administradores serão preservadas. Esta acção não pode ser desfeita."
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      toast.info("Iniciando reset do sistema...");

      const { data, error } = await (supabase.rpc as any)('system_cleanup_v2');

      if (error) {
        console.error("Error calling system_cleanup_v2:", error);
        toast.error("Erro ao resetar o sistema: " + error.message);
        return;
      }

      if (!data?.success) {
        toast.error(data?.message || "Erro ao resetar o sistema");
        return;
      }

      toast.success("Sistema resetado com sucesso!");
      console.log("Cleanup details:", (data as any).deleted_counts);
      await loadDashboardData();
    } catch (error) {
      console.error("Error resetting system:", error);
      toast.error("Erro ao resetar o sistema");
    } finally {
      setLoading(false);
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

  const totalPending = stats.pendingPayments + stats.pendingTasks + stats.pendingWithdrawals + stats.pendingDeposits + stats.pendingKyc;

  return (
    <div className="min-h-screen bg-background bg-mesh-gradient selection:bg-primary/30">
      <AdminSidebar
        onLogout={handleLogout}
        activeSection={activeSection}
        onSectionChange={(section) => {
          setActiveSection(section);
          setIsSidebarOpen(false);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        stats={stats}
      />

      <main className="lg:ml-64 relative min-h-screen">
        {/* Animated Background Orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-float" />
          <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[150px] animate-pulse" />
        </div>

        <AdminHeader
          title={
            activeSection === "dashboard" ? "Central de Comando" :
              activeSection === "campanhas" ? "Gestão de Campanhas" :
                activeSection === "pagamentos" ? "Aprovação de Pagamentos" :
                  activeSection === "depositos" ? "Controle de Depósitos" :
                    activeSection === "usuarios" ? "Gestão de Usuários" :
                      activeSection === "saques" ? "Processamento de Saques" :
                        activeSection === "tarefas" ? "Revisão de Tarefas" :
                          activeSection === "verificacoes" ? "Verificação de Contas" :
                            activeSection === "indicacoes" ? "Gestão de Indicações" :
                              activeSection === "notificacoes" ? "Mensageria" :
                                activeSection === "chat-moderacao" ? "Comunidade & Moderação" : "Administração"
          }
          subtitle={
            activeSection === "dashboard" ? "MONITORAMENTO GLOBAL EM TEMPO REAL" :
              activeSection === "indicacoes" ? "VALORIZAÇÃO DO ECOSSISTEMA" :
                activeSection === "notificacoes" ? "COMUNICAÇÃO MULTICANAL" :
                  "GESTÃO E CONTROLE OPERACIONAL"
          }
          userName={userName}
          stats={stats}
          onNavigate={setActiveSection}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <div className="p-8 relative z-10">
          {/* Main Highlights Section */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-primary rounded-full shadow-neon" />
              <h2 className="text-2xl font-black font-display text-white tracking-tight uppercase">Dashboard Executivo</h2>
            </div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl group transition-all hover:bg-white/10">
              <Clock className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Última actualização: agora</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatsCard
              title="Campanhas por Ativar"
              value={stats.pendingPayments}
              icon={CreditCard}
              variant={stats.pendingPayments > 0 ? "warning" : "default"}
            />
            <StatsCard
              title="Validação de Tarefas"
              value={stats.pendingTasks}
              icon={CheckSquare}
              variant={stats.pendingTasks > 0 ? "warning" : "default"}
            />
            <StatsCard
              title="Tesouraria / Saques"
              value={stats.pendingWithdrawals}
              icon={Wallet}
              variant={stats.pendingWithdrawals > 0 ? "warning" : "default"}
            />
            <StatsCard
              title="Depósitos Pendentes"
              value={stats.pendingDeposits}
              icon={PlusCircle}
              variant={stats.pendingDeposits > 0 ? "warning" : "default"}
            />
            <StatsCard
              title="YouTube Setup"
              value={stats.pendingYoutube}
              icon={Youtube}
              variant={stats.pendingYoutube > 0 ? "warning" : "default"}
            />
            <StatsCard
              title="Ecossistema / Usuários"
              value={stats.totalUsers}
              icon={Users}
              variant="default"
            />
            <StatsCard
              title="Total de Indicações"
              value={stats.totalReferrals}
              icon={UserPlus}
              variant="success"
            />
            <StatsCard
              title="Comissões Pagas"
              value={formatPrice(stats.totalCommissionsPaid)}
              icon={TrendingUp}
              variant="success"
            />
          </div>

          {/* Secondary Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <div className="card-premium-glow p-8 overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Impacto de Mercado</h3>
              </div>
              <p className="text-4xl font-black font-display text-white">{stats.activeCampaigns}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-2">Campanhas em Execução</p>
            </div>

            <div className="card-premium-glow p-8 overflow-hidden group border-gold/20">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-gold/10 rounded-full blur-2xl group-hover:bg-gold/20 transition-all" />
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-2xl bg-gold/10 border border-gold/20 text-gold">
                  <Wallet className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Saúde Financeira</h3>
              </div>
              <p className="text-4xl font-black font-display text-white">{formatPrice(stats.totalRevenue)}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gold mt-2">Património Líquido Acumulado</p>
            </div>

            <div className="card-premium-glow p-8 overflow-hidden group border-red-500/20">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all" />
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Centro de Alertas</h3>
              </div>
              <p className="text-4xl font-black font-display text-white">{totalPending}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mt-2">Requisições de Alta Criticidade</p>
            </div>
          </div>

          {/* Main Content based on active section */}
          {activeSection === "dashboard" && (
            <div className="card-premium-glow p-1 border-white/5 backdrop-blur-3xl overflow-hidden mb-8">
              <Tabs defaultValue="payments" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-white/5 p-1.5 h-auto rounded-xl">
                  <TabsTrigger
                    value="payments"
                    className="relative py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase tracking-widest text-[10px] transition-all"
                  >
                    Investimentos
                    {stats.pendingPayments > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-background/20 rounded-md text-[9px]">
                        {stats.pendingPayments}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="tasks"
                    className="relative py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase tracking-widest text-[10px] transition-all"
                  >
                    Operações
                    {stats.pendingTasks > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-background/20 rounded-md text-[9px]">
                        {stats.pendingTasks}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="withdrawals"
                    className="relative py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase tracking-widest text-[10px] transition-all"
                  >
                    Liquidações
                    {stats.pendingWithdrawals > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-background/20 rounded-md text-[9px]">
                        {stats.pendingWithdrawals}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="deposits"
                    className="relative py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase tracking-widest text-[10px] transition-all"
                  >
                    Recargas
                    {stats.pendingDeposits > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-background/20 rounded-md text-[9px]">
                        {stats.pendingDeposits}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <div className="p-6">
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

                  <TabsContent value="deposits">
                    <div className="space-y-4">
                      <h2 className="text-lg font-display font-bold text-foreground">
                        Solicitações de Depósito
                      </h2>
                      <DepositsTable />
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
                </div>
              </Tabs>
            </div>
          )}

          {activeSection === "campanhas" && (
            <div className="card-premium-glow p-8 mb-8">
              <h2 className="text-lg font-display font-black text-white uppercase tracking-widest mb-6">
                Gestão de Campanhas
              </h2>
              <CampaignsTable />
            </div>
          )}

          {activeSection === "depositos" && (
            <div className="card-premium-glow p-8 mb-8">
              <h2 className="text-lg font-display font-black text-white uppercase tracking-widest mb-6">
                Aprovação de Saldo
              </h2>
              <DepositsTable />
            </div>
          )}

          {activeSection === "pagamentos" && (
            <div className="card-premium-glow p-8 mb-8">
              <h2 className="text-lg font-display font-black text-white uppercase tracking-widest mb-6">
                Pagamentos de Clientes
              </h2>
              <PaymentsTable
                campaigns={pendingCampaigns}
                onRefresh={loadDashboardData}
              />
            </div>
          )}

          {activeSection === "tarefas" && (
            <div className="card-premium-glow p-8 mb-8">
              <h2 className="text-lg font-display font-black text-white uppercase tracking-widest mb-6">
                Controle de Qualidade
              </h2>
              <TasksTable
                tasks={pendingTasks}
                onRefresh={loadDashboardData}
              />
            </div>
          )}

          {activeSection === "usuarios" && (
            <div className="card-premium-glow p-8 mb-8">
              <h2 className="text-lg font-display font-black text-white uppercase tracking-widest mb-6">
                Banco de Talentos
              </h2>
              <UsersTable
                users={users}
                onRefresh={loadDashboardData}
              />
            </div>
          )}

          {activeSection === "saques" && (
            <div className="card-premium-glow p-8 mb-8">
              <h2 className="text-lg font-display font-black text-white uppercase tracking-widest mb-6">
                Processamento Financeiro
              </h2>
              <WithdrawalsTable
                withdrawals={pendingWithdrawals}
                onRefresh={loadDashboardData}
              />
            </div>
          )}

          {activeSection === "verificacoes" && (
            <div className="card-premium-glow p-8 mb-8">
              <h2 className="text-lg font-display font-black text-white uppercase tracking-widest mb-6">
                Manual KYC / Validação de Identidade
              </h2>
              <KycTable
                kycDocuments={pendingKyc}
                onRefresh={loadDashboardData}
              />
            </div>
          )}

          {activeSection === "antifraude" && (
            <div className="card-premium-glow p-8 mb-8">
              <h2 className="text-lg font-display font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                Inteligência Antifraude
              </h2>
              <p className="text-muted-foreground mt-2">
                Monitoramento de dispositivos bloqueados e padrões de comportamento suspeitos.
              </p>
            </div>
          )}

          {activeSection === "chat-moderacao" && (
            <div className="space-y-8">
              <div className="card-premium-glow p-8">
                <h2 className="text-lg font-display font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-primary" />
                  Moderação do Chat
                </h2>
                <ChatModeration />
              </div>

              <div className="card-premium-glow p-8">
                <h2 className="text-lg font-display font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-primary" />
                  Chat em Tempo Real
                </h2>
                <WorkerChat user={user} profile={profile} />
              </div>
            </div>
          )}

          {activeSection === "indicacoes" && (
            <div className="card-premium-glow p-8 mb-8">
              <h2 className="text-lg font-display font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-primary" />
                Campanha de Indicações
              </h2>
              <ReferralsManager />
            </div>
          )}

          {activeSection === "notificacoes" && (
            <div className="card-premium-glow p-8 mb-8">
              <h2 className="text-lg font-display font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <Bell className="w-6 h-6 text-primary" />
                Central de Notificações
              </h2>
              <NotificationsManager />
            </div>
          )}

          {activeSection === "registros" && (
            <div className="card-premium-glow p-8 mb-8">
              <h2 className="text-lg font-display font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Relatórios de Actividade
              </h2>
              <UserActivityReport />
            </div>
          )}

          {activeSection === "configuracoes" && (
            <div className="card-premium-glow p-8 mb-8 border-red-500/20">
              <h2 className="text-lg font-display font-black text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                <Settings className="w-6 h-6 text-primary" />
                Configurações Críticas
              </h2>
              <p className="text-muted-foreground mb-8">
                Parâmetros globais e manutenção da infraestrutura.
              </p>

              <div className="pt-8 border-t border-white/5">
                <h3 className="text-md font-display font-black text-red-500 mb-2 flex items-center gap-2 uppercase tracking-tighter">
                  <AlertTriangle className="w-5 h-5" />
                  ZONA DE RISCO MÁXIMO
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  A limpeza total do sistema apagará todas as campanhas, tarefas, depósitos, saques, mensagens de chat e registos operacionais. Os saldos serão repostos a zero.
                  <strong className="text-red-400 block mt-1">AS CONTAS DE UTILIZADORES E ADMINISTRADORES SERÃO PRESERVADAS. ESTA ACÇÃO NÃO PODE SER DESFEITA.</strong>
                </p>
                <Button
                  variant="destructive"
                  onClick={handleResetSystem}
                  className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all px-8 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Resetar Ecossistema
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Admin;
