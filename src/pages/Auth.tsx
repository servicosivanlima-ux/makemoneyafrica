import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, ArrowLeft, Briefcase, Wallet, Shield } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().email("Email inválido").max(255, "Email muito longo");
const passwordSchema = z.string().min(6, "Mínimo 6 caracteres").max(72, "Senha muito longa");
const phoneSchema = z.string().min(9, "Telefone inválido").max(15, "Telefone inválido");
const nameSchema = z.string().min(2, "Nome muito curto").max(100, "Nome muito longo");

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const initialType = searchParams.get("type") || "client";
  const initialSignup = searchParams.get("signup") === "true";
  
  const [isSignup, setIsSignup] = useState(initialSignup);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [userType, setUserType] = useState<"client" | "worker">(initialType as "client" | "worker");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Common fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  
  // Client specific
  const [accountType, setAccountType] = useState<"personal" | "company">("personal");
  const [pageName, setPageName] = useState("");
  
  // Worker specific
  const [withdrawMethod, setWithdrawMethod] = useState<"iban" | "multicaixa">("iban");
  const [ibanBank, setIbanBank] = useState("");
  const [ibanNumber, setIbanNumber] = useState("");
  const [multicaixaNumber, setMulticaixaNumber] = useState("");
  const [socialLinks, setSocialLinks] = useState({
    facebook: "",
    instagram: "",
    tiktok: "",
    youtube: "",
  });

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // TODO: Redirect based on user role
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateForm = () => {
    try {
      emailSchema.parse(email);
      
      if (isForgotPassword) {
        return true;
      }
      
      passwordSchema.parse(password);
      
      if (isSignup) {
        nameSchema.parse(name);
        phoneSchema.parse(phone);
        
        if (userType === "worker") {
          // At least one social link required
          const hasValidSocial = Object.values(socialLinks).some(link => link.trim().length > 0);
          if (!hasValidSocial) {
            toast.error("Adicione pelo menos uma rede social válida");
            return false;
          }
          
          if (withdrawMethod === "iban" && (!ibanBank || !ibanNumber)) {
            toast.error("Preencha os dados bancários");
            return false;
          }
          
          if (withdrawMethod === "multicaixa" && !multicaixaNumber) {
            toast.error("Preencha o número Multicaixa Express");
            return false;
          }
        }
        
        if (userType === "client" && !pageName.trim()) {
          toast.error("Preencha o nome da página ou empresa");
          return false;
        }
      }
      
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
      return false;
    }
  };

  const handleForgotPassword = async () => {
    try {
      emailSchema.parse(email);
    } catch {
      toast.error("Por favor, insira um email válido");
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      
      if (error) throw error;
      
      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
      setIsForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar email de recuperação");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isForgotPassword) {
      await handleForgotPassword();
      return;
    }
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name,
              phone,
              user_type: userType,
              account_type: userType === "client" ? accountType : null,
              page_name: userType === "client" ? pageName : null,
              withdraw_method: userType === "worker" ? withdrawMethod : null,
              social_links: userType === "worker" ? socialLinks : null,
            }
          }
        });
        
        if (error) throw error;
        
        if (data.user) {
          toast.success("Conta criada com sucesso! Faça login para continuar.");
          setIsSignup(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Email ou senha incorretos");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("Confirme seu email antes de fazer login");
          } else {
            toast.error(error.message);
          }
          return;
        }
        
        toast.success("Login realizado com sucesso!");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar solicitação");
    } finally {
      setLoading(false);
    }
  };

  const hasValidSocialLink = Object.values(socialLinks).some(link => link.trim().length > 0);

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Back button */}
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Link>

        <div className="card-elevated p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-lime flex items-center justify-center mx-auto mb-4">
              <span className="font-display font-bold text-2xl text-primary-foreground">M</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              {isForgotPassword ? "Recuperar Senha" : isSignup ? "Criar Conta" : "Bem-vindo de Volta"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isForgotPassword 
                ? "Insira seu email para receber o link de recuperação" 
                : isSignup 
                  ? "Preencha os dados para começar" 
                  : "Entre para acessar sua conta"}
            </p>
          </div>

          {/* User type selector (only for signup) */}
          {isSignup && !isForgotPassword && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setUserType("client")}
                className={`p-4 rounded-xl border transition-all duration-200 flex flex-col items-center gap-2 ${
                  userType === "client"
                    ? "border-primary bg-primary/10 shadow-glow"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <Briefcase className={`w-6 h-6 ${userType === "client" ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${userType === "client" ? "text-foreground" : "text-muted-foreground"}`}>
                  Cliente
                </span>
              </button>
              <button
                type="button"
                onClick={() => setUserType("worker")}
                className={`p-4 rounded-xl border transition-all duration-200 flex flex-col items-center gap-2 ${
                  userType === "worker"
                    ? "border-gold bg-gold/10 shadow-[0_0_30px_hsl(45_93%_58%/0.15)]"
                    : "border-border hover:border-gold/30"
                }`}
              >
                <Wallet className={`w-6 h-6 ${userType === "worker" ? "text-gold" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${userType === "worker" ? "text-foreground" : "text-muted-foreground"}`}>
                  Trabalhador
                </span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common fields */}
            {isSignup && !isForgotPassword && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Nome Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-styled w-full"
                    placeholder="Seu nome"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Telefone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-styled w-full"
                    placeholder="+244 923 000 000"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-styled w-full"
                placeholder="seu@email.com"
                required
              />
            </div>

            {!isForgotPassword && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-styled w-full pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {!isSignup && (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-primary hover:text-primary/80 mt-2 transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
            )}

            {/* Client specific fields */}
            {isSignup && !isForgotPassword && userType === "client" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Tipo de Conta</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAccountType("personal")}
                      className={`p-3 rounded-lg border text-sm transition-all ${
                        accountType === "personal"
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      Conta Própria
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType("company")}
                      className={`p-3 rounded-lg border text-sm transition-all ${
                        accountType === "company"
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      Empresa
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Nome da Página/Empresa
                  </label>
                  <input
                    type="text"
                    value={pageName}
                    onChange={(e) => setPageName(e.target.value)}
                    className="input-styled w-full"
                    placeholder="Nome do seu negócio ou página"
                    required
                  />
                </div>
              </>
            )}

            {/* Worker specific fields */}
            {isSignup && !isForgotPassword && userType === "worker" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Método de Saque</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setWithdrawMethod("iban")}
                      className={`p-3 rounded-lg border text-sm transition-all ${
                        withdrawMethod === "iban"
                          ? "border-gold bg-gold/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-gold/30"
                      }`}
                    >
                      IBAN Bancário
                    </button>
                    <button
                      type="button"
                      onClick={() => setWithdrawMethod("multicaixa")}
                      className={`p-3 rounded-lg border text-sm transition-all ${
                        withdrawMethod === "multicaixa"
                          ? "border-gold bg-gold/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-gold/30"
                      }`}
                    >
                      Multicaixa Express
                    </button>
                  </div>
                </div>

                {withdrawMethod === "iban" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Banco</label>
                      <select
                        value={ibanBank}
                        onChange={(e) => setIbanBank(e.target.value)}
                        className="input-styled w-full"
                        required
                      >
                        <option value="">Selecione o banco</option>
                        <option value="BFA">BFA</option>
                        <option value="BIC">BIC</option>
                        <option value="BANCO_SOL">Banco SOL</option>
                        <option value="BAI">BAI</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Número IBAN</label>
                      <input
                        type="text"
                        value={ibanNumber}
                        onChange={(e) => setIbanNumber(e.target.value)}
                        className="input-styled w-full"
                        placeholder="AO06..."
                        required
                      />
                    </div>
                  </>
                )}

                {withdrawMethod === "multicaixa" && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Número Multicaixa Express
                    </label>
                    <input
                      type="text"
                      value={multicaixaNumber}
                      onChange={(e) => setMulticaixaNumber(e.target.value)}
                      className="input-styled w-full"
                      placeholder="923 000 000"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Redes Sociais (mínimo 1)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={socialLinks.facebook}
                      onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                      className="input-styled w-full text-sm"
                      placeholder="Link do Facebook"
                    />
                    <input
                      type="url"
                      value={socialLinks.instagram}
                      onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                      className="input-styled w-full text-sm"
                      placeholder="Link do Instagram"
                    />
                    <input
                      type="url"
                      value={socialLinks.tiktok}
                      onChange={(e) => setSocialLinks({ ...socialLinks, tiktok: e.target.value })}
                      className="input-styled w-full text-sm"
                      placeholder="Link do TikTok"
                    />
                    <input
                      type="url"
                      value={socialLinks.youtube}
                      onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })}
                      className="input-styled w-full text-sm"
                      placeholder="Link do YouTube"
                    />
                  </div>
                  {!hasValidSocialLink && (
                    <p className="text-xs text-destructive mt-1">Adicione pelo menos uma rede social</p>
                  )}
                </div>
              </>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${
                userType === "worker" && isSignup && !isForgotPassword
                  ? "btn-gold"
                  : "btn-primary"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading 
                ? "Processando..." 
                : isForgotPassword 
                  ? "Enviar Link de Recuperação" 
                  : isSignup 
                    ? "Criar Conta" 
                    : "Entrar"}
            </button>
          </form>

          {/* Toggle signup/login */}
          <div className="mt-6 text-center">
            {isForgotPassword ? (
              <button
                onClick={() => setIsForgotPassword(false)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-primary font-medium">← Voltar ao login</span>
              </button>
            ) : (
              <button
                onClick={() => setIsSignup(!isSignup)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isSignup ? (
                  <>Já tem uma conta? <span className="text-primary font-medium">Entrar</span></>
                ) : (
                  <>Não tem conta? <span className="text-primary font-medium">Criar conta</span></>
                )}
              </button>
            )}
          </div>

          {/* Security notice */}
          <div className="mt-6 p-3 rounded-lg bg-muted/50 flex items-start gap-2">
            <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Seus dados são protegidos com criptografia. Nunca compartilhamos suas informações.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
