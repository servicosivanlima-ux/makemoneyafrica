import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Mail, AlertTriangle } from "lucide-react";

// Components
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ClientStats from "@/components/dashboard/client/ClientStats";
import ClientCampaigns from "@/components/dashboard/client/ClientCampaigns";
import CreateCampaign from "@/components/dashboard/client/CreateCampaign";
import ClientSettings from "@/components/dashboard/client/ClientSettings";
import WorkerStats from "@/components/dashboard/worker/WorkerStats";
import TasksList from "@/components/dashboard/worker/TasksList";
import WithdrawalRequest from "@/components/dashboard/worker/WithdrawalRequest";
import WorkerSettings from "@/components/dashboard/worker/WorkerSettings";
import NotificationsList from "@/components/dashboard/NotificationsList";
import WorkerVerification from "@/components/dashboard/worker/WorkerVerification";
import ClientWallet from "@/components/dashboard/client/ClientWallet";
import WorkerChat from "@/components/dashboard/worker/WorkerChat";
import WorkerReferrals from "@/components/dashboard/worker/WorkerReferrals";

interface ClientStatsData {
  activeCampaigns: number;
  totalSpent: number;
  completedTasks: number;
  pendingTasks: number;
  totalTargetTasks: number;
  walletBalance: number;
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
  const [profile, setProfile] = useState<any>(null);

  // Stats
  const [clientStats, setClientStats] = useState<ClientStatsData>({
    activeCampaigns: 0,
    totalSpent: 0,
    completedTasks: 0,
    pendingTasks: 0,
    totalTargetTasks: 0,
    walletBalance: 0,
  });
  const [workerStats, setWorkerStats] = useState<WorkerStatsData>({
    balance: 0,
    availableTasks: 0,
    completedTasks: 0,
    totalEarned: 0,
  });
  const [workerVerified, setWorkerVerified] = useState<boolean>(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (!session) {
        navigate("/auth");
      } else {
        // Check for admin role first
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle()
          .then(({ data: adminRole }) => {
            if (adminRole) {
              navigate("/admin");
            } else {
              // Allow unconfirmed users but let them know
              const type = session.user.user_metadata?.user_type || "client";
              setUserType(type);
              loadStats(session.user.id, type);
              if (type === "worker") {
                checkWorkerVerification(session.user.id);
              }
              // Track user access
              (supabase.rpc as any)("track_user_access").then(({ error }: any) => {
                if (error) console.error("Error tracking access:", error);
              });
            }
          });
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (!session) {
        navigate("/auth");
      } else {
        // Fetch profile
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .single()
          .then(({ data: profileData }) => {
            setProfile(profileData);

            // Check for admin role first
            supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .eq("role", "admin")
              .maybeSingle()
              .then(({ data: adminRole }) => {
                if (adminRole) {
                  navigate("/admin");
                } else {
                  // Allow unconfirmed users
                  const type = profileData?.user_type || session?.user.user_metadata?.user_type || "client";
                  setUserType(type);
                  loadStats(session?.user.id || "", type);
                  if (type === "worker") {
                    checkWorkerVerification(session?.user.id || "");
                  }
                  // Track user access
                  (supabase.rpc as any)("track_user_access").then(({ error }: any) => {
                    if (error) console.error("Error tracking access (session):", error);
                  });
                }
              });
          });
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Check if worker has completed verification (KYC + withdraw method)
  const checkWorkerVerification = async (userId: string) => {
    try {
      // Check if KYC document exists
      const { data: kycDoc } = await (supabase as any)
        .from("kyc_documents")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      // Check if withdraw method exists
      const { data: withdrawMethod } = await (supabase as any)
        .from("withdraw_methods")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      // Worker is verified if both KYC and withdraw method exist
      setWorkerVerified(!!kycDoc && !!withdrawMethod);
    } catch (error) {
      console.error("Error checking worker verification:", error);
      setWorkerVerified(false);
    }
  };

  const loadStats = async (userId: string, type: string) => {
    try {
      if (type === "client") {
        // Load client stats
        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("status, price, completed_count, target_count")
          .eq("client_id", userId);

        const activeCampaigns = campaigns?.filter(c => c.status === "active").length || 0;
        const totalSpent = campaigns?.filter(c => ["active", "completed"].includes(c.status))
          .reduce((sum, c) => sum + c.price, 0) || 0;

        // Fetch wallet balance from profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("wallet_balance")
          .eq("user_id", userId)
          .single();

        const walletBalance = profileData?.wallet_balance || 0;

        const completedTasks = campaigns?.reduce((sum, c) => sum + (c.completed_count || 0), 0) || 0;
        const totalTargetTasks = campaigns?.filter(c => ["active", "completed"].includes(c.status))
          .reduce((sum, c) => sum + (c.target_count || 0), 0) || 0;

        setClientStats({
          activeCampaigns,
          totalSpent,
          completedTasks,
          pendingTasks: campaigns?.filter(c => c.status === "pending_payment").length || 0,
          totalTargetTasks,
          walletBalance,
        });
      } else {
        // Load worker stats
        const { data: tasks } = await supabase
          .from("tasks")
          .select("status, reward_amount, campaign_id")
          .eq("worker_id", userId);

        const completedTasks = tasks?.filter(t => t.status === "approved").length || 0;
        const totalEarned = tasks?.filter(t => t.status === "approved")
          .reduce((sum, t) => sum + t.reward_amount, 0) || 0;

        // Get pending withdrawals to calculate balance
        const { data: withdrawals } = await supabase
          .from("withdrawals")
          .select("amount, status")
          .eq("worker_id", userId);

        const withdrawnAmount = withdrawals?.filter(w => ["approved", "pending"].includes(w.status))
          .reduce((sum, w) => sum + w.amount, 0) || 0;

        // Get referral commissions
        const { data: refStats } = await (supabase.rpc as any)("get_worker_referral_stats").select("*").maybeSingle();
        const referralEarned = refStats?.total_commissions || 0;

        const balance = totalEarned + referralEarned - withdrawnAmount;

        // Get IDs of campaigns the worker has already claimed
        const claimedCampaignIds = tasks?.map(t => t.campaign_id) || [];

        // Get available tasks count (campaigns not already claimed by this worker)
        const { data: availableCampaigns } = await supabase
          .from("available_campaigns_for_workers")
          .select("id")
          .eq("status", "active");

        const realAvailableTasks = availableCampaigns?.filter(c => !claimedCampaignIds.includes(c.id)).length || 0;

        setWorkerStats({
          balance,
          availableTasks: realAvailableTasks,
          completedTasks,
          totalEarned: totalEarned + referralEarned,
        });
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleResendEmail = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user?.email || "",
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        }
      });
      if (error) throw error;
      toast.success("E-mail de confirmação reenviado!");
    } catch (error: any) {
      toast.error("Erro ao reenviar: " + error.message);
    }
  };

  const VerificationBanner = () => {
    if (user?.email_confirmed_at) return null;
    return (
      <div className="bg-primary/10 border-b border-primary/20 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top duration-500">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">E-mail não confirmado:</strong> Verifique seu inbox ({user?.email}) para activar todos os recursos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sessionStorage.setItem("signup_email", user?.email || "");
              sessionStorage.setItem("signup_step", "verification");
              navigate("/auth");
            }}
            className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 bg-gold text-gold-foreground rounded-lg hover:bg-gold/90 transition-all shadow-gold-premium"
          >
            Inserir Código
          </button>
          <button
            onClick={handleResendEmail}
            className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-neon"
          >
            Reenviar Link/Código
          </button>
        </div>
      </div>
    );
  };

  const refreshData = async () => {
    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setProfile(profileData);
      loadStats(user.id, userType);
      if (userType === "worker") {
        checkWorkerVerification(user.id);
      }
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
      case "carteira": return "Gerencie seu saldo e depósitos";
      case "chat": return "Chat da Comunidade";
      case "indicacoes": return "Teu Histórico de Indicações e Ganhos";
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
        <VerificationBanner />
        <DashboardHeader
          userName={userName}
          subtitle={getSubtitle()}
          userId={user?.id}
          accountType={profile?.account_type}
        />

        <div className="p-6">
          {/* Client Dashboard */}
          {userType === "client" && activeSection === "dashboard" && (
            <>
              <ClientStats {...clientStats} country={profile?.country} />
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
              onRecharge={() => setActiveSection("carteira")}
            />
          )}

          {userType === "client" && activeSection === "carteira" && (
            <ClientWallet user={user} />
          )}

          {/* Worker Dashboard */}
          {userType === "worker" && activeSection === "dashboard" && (
            <>
              <WorkerStats {...workerStats} country={profile?.country} />
              <TasksList user={user} onTaskComplete={refreshData} />
            </>
          )}

          {userType === "worker" && activeSection === "tarefas" && (
            <TasksList user={user} onTaskComplete={refreshData} />
          )}

          {userType === "worker" && activeSection === "saques" && (
            workerVerified ? (
              <WithdrawalRequest user={user} balance={workerStats.balance} onWithdrawalComplete={refreshData} />
            ) : (
              <WorkerVerification
                profile={profile}
                onComplete={refreshData}
              />
            )
          )}

          {userType === "worker" && activeSection === "chat" && (
            <WorkerChat user={user} profile={profile} />
          )}

          {userType === "worker" && activeSection === "indicacoes" && (
            <WorkerReferrals user={user} />
          )}

          {/* Common sections */}
          {activeSection === "notificacoes" && (
            <NotificationsList user={user} />
          )}

          {activeSection === "configuracoes" && userType === "client" && (
            <ClientSettings user={user} />
          )}

          {activeSection === "configuracoes" && userType === "worker" && (
            <WorkerSettings user={user} />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
