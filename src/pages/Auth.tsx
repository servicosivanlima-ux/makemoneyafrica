import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, ArrowLeft, Briefcase, Wallet, Shield, Loader2, ArrowRight, User, Lock, Mail, Smartphone, Globe } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";

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
  const [step, setStep] = useState<"form" | "verification">("form");
  const [otpCode, setOtpCode] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(searchParams.get("reset") === "true");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Common fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("AO");
  const [nif, setNif] = useState("");

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

  const phoneConfigs: Record<string, { placeholder: string; label: string; prefix: string }> = {
    AO: { placeholder: "9xx xxx xxx", label: "WhatsApp de Angola", prefix: "+244" },
    PT: { placeholder: "9xx xxx xxx", label: "WhatsApp de Portugal", prefix: "+351" },
    MZ: { placeholder: "8xx xxx xxx", label: "WhatsApp de Moçambique", prefix: "+258" },
    BR: { placeholder: "(xx) 9xxxx-xxxx", label: "WhatsApp do Brasil", prefix: "+55" },
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        if (session.user.email_confirmed_at && !isResettingPassword) {
          navigate("/dashboard");
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          if (session.user.email_confirmed_at && !isResettingPassword) {
            navigate("/dashboard");
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isResettingPassword]);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("signup_email");
    const savedStep = sessionStorage.getItem("signup_step") as "form" | "verification";
    if (savedEmail) setEmail(savedEmail);
    if (savedStep) setStep(savedStep);
  }, []);

  useEffect(() => {
    if (email) sessionStorage.setItem("signup_email", email);
    sessionStorage.setItem("signup_step", step);
  }, [email, step]);

  useEffect(() => {
    if (isSignup && !isForgotPassword) {
      const config = phoneConfigs[country];
      if (config) {
        const isCurrentlyEmptyOrPrefixOnly = !phone || phone.trim().startsWith("+");
        if (isCurrentlyEmptyOrPrefixOnly) {
          setPhone(config.prefix + " ");
        }
      }
    }
  }, [country, isSignup, isForgotPassword]);

  const validateForm = () => {
    try {
      emailSchema.parse(email);
      if (isForgotPassword) return true;
      passwordSchema.parse(password);
      if (isSignup) {
        nameSchema.parse(name);
        phoneSchema.parse(phone);
        if (userType === "worker") {
          // No complex validation for workers at Level 0
          return true;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgotPassword) {
      if (!email) {
        toast.error("Por favor, insira seu e-mail.");
        return;
      }
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?reset=true`,
        });
        if (error) throw error;
        toast.success("Link de recuperação enviado para seu e-mail!");
        setIsForgotPassword(false);
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
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
            emailRedirectTo: `${window.location.origin}/auth`,
            data: {
              full_name: name,
              phone,
              user_type: userType,
              account_type: userType === "client" ? accountType : null,
              page_name: userType === "client" ? pageName : null,
              country,
              nif: accountType === "company" ? nif : null,
            }
          }
        });
        if (data.user) {
          if (data.session) {
            toast.success("Cadastro realizado com sucesso!");
            navigate("/dashboard");
          } else {
            setStep("verification");
            toast.success("Quase lá! Enviamos um código de confirmação para seu e-mail.");
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Login realizado!");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) {
      toast.error("O código deve ter 6 dígitos.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "signup",
      });
      if (error) throw error;
      toast.success("Conta confirmada com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erro ao verificar código.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      toast.error("Email não encontrado.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        }
      });
      if (error) throw error;
      toast.success("Novo código/link enviado para seu e-mail.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-mesh-gradient flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 py-12">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Início</span>
          </Link>
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-premium-glow p-8 md:p-10 relative overflow-hidden"
        >
          {loading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="mt-4 text-xs font-black uppercase tracking-[0.3em] text-primary">Processando</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {isResettingPassword ? (
              <motion.div
                key="reset"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <h2 className="text-3xl font-black text-foreground mb-4">Nova Senha</h2>
                  <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Defina sua nova credencial de acesso</p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nova Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-premium pl-11 pr-11"
                        placeholder="••••••••"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2">
                        {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirmar Nova Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input-premium pl-11"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-premium w-full h-16 text-lg">
                    Atualizar Senha
                  </button>
                </form>
              </motion.div>
            ) : isForgotPassword ? (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <h2 className="text-3xl font-black text-foreground mb-4">Recuperar Acesso</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">Insira seu e-mail para receber um link de recuperação.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Seu E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-premium pl-11" placeholder="exemplo@email.com" required />
                    </div>
                  </div>

                  <button type="submit" className="btn-premium w-full h-16 text-lg">
                    Enviar Link de Recuperação
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="w-full text-center text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
                  >
                    Voltar ao Login
                  </button>
                </form>
              </motion.div>
            ) : step === "verification" ? (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <h2 className="text-3xl font-black text-foreground mb-4">Verificação</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Enviamos um código para <span className="text-foreground font-bold">{email}</span>. Insira abaixo para ativar sua conta.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-4xl tracking-[0.5em] font-black focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                  <button type="submit" className="btn-premium w-full h-16 text-lg">
                    Confirmar Conta
                  </button>

                  <div className="space-y-4 pt-4">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="w-full text-center text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:underline transition-colors"
                    >
                      Não recebi o código ou link
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep("form")}
                      className="w-full text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Voltar ao formulário
                    </button>
                  </div>
                </form>
                <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
                    Dica: Se você recebeu um link de confirmação, pode clicar nele diretamente no seu e-mail.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="text-center mb-10">
                  <div className="flex items-center justify-center mx-auto mb-6">
                    <img
                      src="/logo.png"
                      alt="Logo"
                      className="w-24 h-24 object-contain drop-shadow-neon animate-pulse-slow"
                    />
                  </div>
                  <h1 className="text-3xl font-black text-foreground mb-3">
                    {isSignup ? "Criar Conta" : "Entrar na Plataforma"}
                  </h1>
                  <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
                    {isSignup ? "Plataforma Nº1 em Angola" : "Bem-vindo de volta"}
                  </p>
                </div>

                {isSignup && !isForgotPassword && (
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <button
                      type="button"
                      onClick={() => setUserType("client")}
                      className={`p-5 rounded-2xl border transition-all flex flex-col items-center gap-3 ${userType === "client" ? "glass-card-lime border-primary/50 shadow-neon" : "bg-white/5 border-white/5 hover:border-white/20"
                        }`}
                    >
                      <Briefcase className={`w-6 h-6 ${userType === "client" ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Cliente</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserType("worker")}
                      className={`p-5 rounded-2xl border transition-all flex flex-col items-center gap-3 ${userType === "worker" ? "glass-card-gold border-gold/50 shadow-gold-premium" : "bg-white/5 border-white/5 hover:border-white/20"
                        }`}
                    >
                      <Wallet className={`w-6 h-6 ${userType === "worker" ? "text-gold" : "text-muted-foreground"}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Trabalhador</span>
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {isSignup && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Primeiro e último nome</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-premium pl-11" placeholder="Seu nome" required />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-premium pl-11" placeholder="exemplo@email.com" required />
                    </div>
                  </div>

                  {isSignup && !isForgotPassword && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">País</label>
                        <div className="relative">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="input-premium pl-11 appearance-none cursor-pointer"
                          >
                            <option value="AO" className="bg-background">Angola (+244)</option>
                            <option value="PT" className="bg-background">Portugal (+351)</option>
                            <option value="BR" className="bg-background">Brasil (+55)</option>
                            <option value="MZ" className="bg-background">Moçambique (+258)</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">WhatsApp</label>
                        <div className="relative">
                          <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="input-premium pl-11"
                            placeholder={phoneConfigs[country]?.placeholder}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Senha</label>
                      {!isSignup && (
                        <button type="button" onClick={() => setIsForgotPassword(true)} className="text-[9px] font-black uppercase text-primary hover:underline transition-colors">Esqueceu?</button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-premium pl-11 pr-11"
                        placeholder="••••••••"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2">
                        {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  {isSignup && userType === "client" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-6 pt-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo de Conta</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button type="button" onClick={() => setAccountType("personal")} className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-[0.1em] transition-all ${accountType === "personal" ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/5 text-muted-foreground"}`}>Pessoal</button>
                          <button type="button" onClick={() => setAccountType("company")} className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-[0.1em] transition-all ${accountType === "company" ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/5 text-muted-foreground"}`}>Empresa</button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome do Perfil/Empresa</label>
                        <input type="text" value={pageName} onChange={(e) => setPageName(e.target.value)} className="input-premium" placeholder="Ex: GiraNotícias" required />
                      </div>
                    </motion.div>
                  )}

                  <button type="submit" className="btn-premium w-full h-16 text-lg flex items-center justify-center gap-3">
                    {isSignup ? "Criar Minha Conta" : "Acessar Plataforma"}
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  <div className="text-center pt-4">
                    <p className="text-sm text-muted-foreground">
                      {isSignup ? "Já tem uma conta?" : "Não tem uma conta?"}{" "}
                      <button
                        type="button"
                        onClick={() => setIsSignup(!isSignup)}
                        className="text-primary font-black hover:underline"
                      >
                        {isSignup ? "Fazer Login" : "Cadastrar Agora"}
                      </button>
                    </p>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
