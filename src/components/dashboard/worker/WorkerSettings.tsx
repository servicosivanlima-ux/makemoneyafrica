import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { phoneConfigs, formatPhone, validatePhone } from "@/lib/phone-utils";
import {
  User as UserIcon,
  Phone,
  Mail,
  Save,
  Loader2,
  Wallet,
  Facebook,
  Instagram,
  Youtube,
  Link as LinkIcon,
  Shield,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";

interface WorkerSettingsProps {
  user: User;
}

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  worker_status: string;
  facebook_link?: string | null;
  instagram_link?: string | null;
  tiktok_link?: string | null;
  youtube_link?: string | null;
  personal_info_editable?: boolean;
  country: string;
}

interface KycData {
  doc_type: string;
  doc_number: string;
  doc_name: string;
  verified: boolean;
}

interface WithdrawData {
  type: string;
  identifier: string;
  holder_name: string;
  bank_name: string | null;
  verified: boolean;
}

const WorkerSettings = ({ user }: WorkerSettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    email: "",
    phone: "",
    worker_status: "pending",
    country: "AO",
  });
  const [kyc, setKyc] = useState<KycData | null>(null);
  const [withdraw, setWithdraw] = useState<WithdrawData | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [socials, setSocials] = useState({
    facebook_link: "",
    instagram_link: "",
    tiktok_link: "",
    youtube_link: "",
  });

  useEffect(() => {
    loadProfile();
  }, [user.id]);

  const loadProfile = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, phone, worker_status, personal_info_editable, country, facebook_link, instagram_link, tiktok_link, youtube_link")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        const pd = profileData as any;
        setProfile({
          full_name: pd.full_name || "",
          email: pd.email || "",
          phone: pd.phone || "",
          worker_status: pd.worker_status || "pending",
          facebook_link: pd.facebook_link,
          instagram_link: pd.instagram_link,
          tiktok_link: pd.tiktok_link,
          youtube_link: pd.youtube_link,
          personal_info_editable: pd.personal_info_editable ?? true,
          country: pd.country || "AO",
        });

        setSocials({
          facebook_link: pd.facebook_link || "",
          instagram_link: pd.instagram_link || "",
          tiktok_link: pd.tiktok_link || "",
          youtube_link: pd.youtube_link || "",
        });
      }

      // Load KYC
      const { data: kycData } = await (supabase as any)
        .from("kyc_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (kycData) {
        setKyc(kycData);
      }

      // Load Withdrawal
      const { data: withdrawData } = await (supabase as any)
        .from("withdraw_methods")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (withdrawData) {
        setWithdraw(withdrawData);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile) return;
    const formatted = formatPhone(e.target.value, profile.country);
    setProfile({ ...profile, phone: formatted });
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Preencha ambos os campos de senha");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    // Password complexity check
    if (newPassword.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast.error("A senha deve conter pelo menos um número");
      return;
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      toast.error("A senha deve conter pelo menos um caractere especial");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Senha actualizada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao actualizar senha");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSocials = async () => {
    setSaving(true);
    const hasAtLeastOne = socials.facebook_link || socials.instagram_link || socials.tiktok_link || socials.youtube_link;
    if (!hasAtLeastOne) {
      toast.error("Vincule pelo menos uma rede social!");
      setSaving(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          facebook_link: socials.facebook_link,
          instagram_link: socials.instagram_link,
          tiktok_link: socials.tiktok_link,
          youtube_link: socials.youtube_link,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Redes sociais actualizadas!");
      loadProfile();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar redes sociais");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePersonalInfo = async () => {
    if (!profile) return;

    if (!validatePhone(profile.phone, profile.country)) {
      toast.error(`O telefone deve ter ${phoneConfigs[profile.country]?.digits} dígitos.`);
      return;
    }

    setSaving(true); // Changed from setLoading to setSaving
    try {
      // Verificar duplicidade se o telefone ou nome mudaram
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("phone, full_name")
        .eq("user_id", user.id)
        .single();

      if (currentProfile && (currentProfile.phone !== profile.phone || currentProfile.full_name !== profile.full_name)) {
        const { data: duplicates } = await (supabase.rpc as any)("check_registration_duplicates", {
          p_email: profile.email,
          p_phone: profile.phone,
          p_name: profile.full_name
        });

        if (duplicates && duplicates.length > 0) {
          const phoneDup = duplicates.find((d: any) => d.field_name === 'phone');
          const nameDup = duplicates.find((d: any) => d.field_name === 'name');

          if (phoneDup && currentProfile.phone !== profile.phone) {
            toast.error("Este número de WhatsApp já está em uso.");
            setSaving(false);
            return;
          }
          if (nameDup && currentProfile.full_name !== profile.full_name) {
            toast.error("Este nome já está em uso por outro usuário.");
            setSaving(false);
            return;
          }
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          country: profile.country,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Informações pessoais actualizadas!");
      loadProfile(); // Added to refresh profile data after save
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-primary" />
            Informações Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Primeiro e último nome</Label>
              <Input
                id="full_name"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="bg-background"
                placeholder="Primeiro e último nome"
                disabled={!profile.personal_info_editable}
              />
              {!profile.personal_info_editable && (
                <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-tight">Edição bloqueada pelo sistema</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">País de Residência</Label>
              <Select
                value={profile.country}
                onValueChange={(value) => setProfile({ ...profile, country: value })}
                disabled={!profile.personal_info_editable}
              >
                <SelectTrigger id="country" className="bg-background">
                  <SelectValue placeholder="Selecione o país" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AO">Angola (+244)</SelectItem>
                  <SelectItem value="PT">Portugal (+351)</SelectItem>
                  <SelectItem value="BR">Brasil (+55)</SelectItem>
                  <SelectItem value="MZ">Moçambique (+258)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="pl-10 bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                value={profile?.phone || ""}
                onChange={handlePhoneChange}
                placeholder={phoneConfigs[profile?.country || "AO"]?.placeholder}
                className="pl-10 bg-background" // Added bg-background back
                disabled={!profile?.personal_info_editable}
              />
            </div>
            {!profile.personal_info_editable && (
              <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-tight">Edição bloqueada pelo sistema</p>
            )}
          </div>
          {profile.personal_info_editable && (
            <Button
              onClick={handleSavePersonalInfo}
              disabled={saving}
              className="w-full sm:w-auto font-black uppercase tracking-widest text-xs h-12"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Informações
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Social Networks Section */}
      <Card className="bg-card border-border border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <LinkIcon className="w-5 h-5" />
            Redes Sociais
          </CardTitle>
          <CardDescription>
            Vincule as suas redes sociais para poder realizar tarefas nestas plataformas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="facebook_link" className="flex items-center gap-2">
                <Facebook className="w-4 h-4 text-blue-500" />
                Perfil do Facebook
              </Label>
              <Input
                id="facebook_link"
                placeholder="https://facebook.com/seu.perfil"
                value={socials.facebook_link}
                onChange={(e) => setSocials({ ...socials, facebook_link: e.target.value })}
                className="bg-background focus-visible:ring-primary"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-[9px] text-red-500 font-bold uppercase tracking-tight">* Obrigatório</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram_link" className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-500" />
                Perfil do Instagram
              </Label>
              <Input
                id="instagram_link"
                placeholder="https://instagram.com/seu.user"
                value={socials.instagram_link}
                onChange={(e) => setSocials({ ...socials, instagram_link: e.target.value })}
                className="bg-background focus-visible:ring-primary"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok_link" className="flex items-center gap-2">
                <span className="text-sm">🎵</span>
                Perfil do TikTok
              </Label>
              <Input
                id="tiktok_link"
                placeholder="https://tiktok.com/@seu.user"
                value={socials.tiktok_link}
                onChange={(e) => setSocials({ ...socials, tiktok_link: e.target.value })}
                className="bg-background focus-visible:ring-primary"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtube_link" className="flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-500" />
                Canal do YouTube
              </Label>
              <Input
                id="youtube_link"
                placeholder="https://youtube.com/@seu.canal"
                value={socials.youtube_link}
                onChange={(e) => setSocials({ ...socials, youtube_link: e.target.value })}
                className="bg-background focus-visible:ring-primary"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-[9px] text-red-500 font-bold uppercase tracking-tight">* Obrigatório</p>
            </div>
          </div>
          <Button
            onClick={handleSaveSocials}
            disabled={saving}
            className="w-full sm:w-auto font-black uppercase tracking-widest text-xs h-12"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A guardar...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Redes Sociais
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Identity Verification Status */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Verificação de Identidade
            </div>
            {kyc?.verified ? (
              <span className="text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-500 px-3 py-1 rounded-full border border-green-500/20">
                Verificado
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-widest bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full border border-yellow-500/20">
                Pendente
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Documento de identidade vinculado à sua conta real.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {kyc ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo</p>
                <p className="text-sm font-medium">{kyc.doc_type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Número (Mascarado)</p>
                <p className="text-sm font-medium">****{kyc.doc_number.slice(-4)}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome no Documento</p>
                <p className="text-sm font-medium">{kyc.doc_name}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nenhuma identificação submetida.</p>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal Method */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Método de Levantamento
            </div>
            {withdraw?.verified ? (
              <span className="text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-500 px-3 py-1 rounded-full border border-green-500/20">
                Verificado
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-widest bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full border border-yellow-500/20">
                Pendente
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Destino configurado para os seus ganhos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {withdraw ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo</p>
                <p className="text-sm font-medium uppercase">{withdraw.type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{withdraw.type === 'iban' ? 'IBAN' : 'Número Express'}</p>
                <p className="text-sm font-medium">{withdraw.identifier}</p>
              </div>
              {withdraw.bank_name && (
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Banco</p>
                  <p className="text-sm font-medium">{withdraw.bank_name}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Titular</p>
                <p className="text-sm font-medium">{withdraw.holder_name}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nenhum método de levantamento configurado.</p>
          )}
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card className="bg-card border-border border-primary/20 shadow-neon">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Segurança & Senha
          </CardTitle>
          <CardDescription>
            Defina uma nova senha forte para proteger a sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new_password_worker">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new_password_worker"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 focus-visible:ring-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password_worker">Confirmar Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirm_password_worker"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 focus-visible:ring-primary"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>
          <Button
            onClick={handleUpdatePassword}
            disabled={saving}
            className="w-full sm:w-auto font-black uppercase tracking-widest text-xs h-12"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A actualizar...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Actualizar Senha
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Support Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Suporte & Ajuda
          </CardTitle>
          <CardDescription>
            Precisa de ajuda ou deseja alterar dados sensíveis?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-4">
              Para qualquer anomalia, alteração de dados, solicitações especiais ou dúvidas, contacte exclusivamente o nosso suporte oficial:
            </p>
            <a
              href="https://wa.me/244923066682"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-lg font-bold text-primary hover:underline"
            >
              <Phone className="w-5 h-5" />
              +244 923 066 682
            </a>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default WorkerSettings;
