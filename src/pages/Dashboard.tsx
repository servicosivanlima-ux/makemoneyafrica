import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { 
  LayoutDashboard, 
  Bell, 
  LogOut, 
  Plus, 
  Wallet, 
  TrendingUp, 
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Settings
} from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<"client" | "worker" | "admin">("client");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      } else {
        // Get user type from metadata
        const type = session.user.user_metadata?.user_type || "client";
        setUserType(type);
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
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "Usuário";

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border hidden lg:block">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg bg-gradient-lime flex items-center justify-center">
              <span className="font-display font-bold text-primary-foreground">M</span>
            </div>
            <span className="font-display font-bold text-lg text-foreground">MMWL</span>
          </div>

          <nav className="space-y-1">
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary">
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </a>
            
            {userType === "client" && (
              <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                <Plus className="w-5 h-5" />
                <span>Criar Campanha</span>
              </a>
            )}
            
            {userType === "worker" && (
              <>
                <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                  <CheckCircle className="w-5 h-5" />
                  <span>Tarefas</span>
                </a>
                <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                  <Wallet className="w-5 h-5" />
                  <span>Saques</span>
                </a>
              </>
            )}
            
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              <Bell className="w-5 h-5" />
              <span>Notificações</span>
              <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">3</span>
            </a>
            
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              <Settings className="w-5 h-5" />
              <span>Configurações</span>
            </a>
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                Olá, {userName}! 👋
              </h1>
              <p className="text-sm text-muted-foreground">
                {userType === "client" ? "Gerencie suas campanhas" : "Veja suas tarefas disponíveis"}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
              </button>
              
              <div className="w-9 h-9 rounded-full bg-gradient-lime flex items-center justify-center">
                <span className="font-semibold text-primary-foreground text-sm">
                  {userName[0]?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard content */}
        <div className="p-6">
          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {userType === "client" ? (
              <>
                <div className="card-elevated p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Campanhas Ativas</span>
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">0</div>
                </div>
                <div className="card-elevated p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Total Gasto</span>
                    <Wallet className="w-4 h-4 text-gold" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">0 Kz</div>
                </div>
                <div className="card-elevated p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Tarefas Concluídas</span>
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">0</div>
                </div>
                <div className="card-elevated p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Pendentes</span>
                    <Clock className="w-4 h-4 text-gold" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">0</div>
                </div>
              </>
            ) : (
              <>
                <div className="card-elevated p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Saldo Disponível</span>
                    <Wallet className="w-4 h-4 text-gold" />
                  </div>
                  <div className="text-2xl font-bold text-gradient-gold">0 Kz</div>
                </div>
                <div className="card-elevated p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Tarefas Disponíveis</span>
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">0</div>
                </div>
                <div className="card-elevated p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Tarefas Concluídas</span>
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">0</div>
                </div>
                <div className="card-elevated p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Total Ganho</span>
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">0 Kz</div>
                </div>
              </>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid md:grid-cols-2 gap-6">
            {userType === "client" ? (
              <>
                <div className="card-glow p-6">
                  <h3 className="font-display font-bold text-lg text-foreground mb-2">
                    Criar Nova Campanha
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Comece a promover sua página nas redes sociais
                  </p>
                  <button className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Criar Campanha
                  </button>
                </div>

                <div className="card-elevated p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-gold" />
                    <h3 className="font-display font-bold text-lg text-foreground">
                      Nenhuma campanha ativa
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Crie sua primeira campanha para começar a crescer suas redes sociais.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="card-glow p-6 border-gold/20">
                  <h3 className="font-display font-bold text-lg text-foreground mb-2">
                    Tarefas Disponíveis
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Complete tarefas e ganhe dinheiro
                  </p>
                  <button className="btn-gold flex items-center gap-2">
                    Ver Tarefas
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="card-elevated p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Wallet className="w-5 h-5 text-gold" />
                    <h3 className="font-display font-bold text-lg text-foreground">
                      Solicitar Saque
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Saque mínimo: <span className="text-gold font-semibold">500 AOA</span>
                  </p>
                  <button className="btn-secondary" disabled>
                    Saldo insuficiente
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Recent activity */}
          <div className="mt-8">
            <h2 className="font-display font-bold text-lg text-foreground mb-4">
              Notificações Recentes
            </h2>
            <div className="card-elevated divide-y divide-border">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Bem-vindo à plataforma!</p>
                    <p className="text-xs text-muted-foreground">Agora mesmo</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhuma outra notificação
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
