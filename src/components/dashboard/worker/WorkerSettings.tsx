import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Link as LinkIcon
} from "lucide-react";

interface WorkerSettingsProps {
  user: User;
}

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  withdrawal_method: string | null;
  withdrawal_details: string | null;
  facebook_link: string | null;
  instagram_link: string | null;
  tiktok_link: string | null;
  youtube_link: string | null;
}

const WorkerSettings = ({ user }: WorkerSettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    email: "",
    phone: "",
    withdrawal_method: null,
    withdrawal_details: null,
    facebook_link: null,
    instagram_link: null,
    tiktok_link: null,
    youtube_link: null,
  });

  // Separate state for withdrawal details
  const [ibanBank, setIbanBank] = useState("");
  const [ibanNumber, setIbanNumber] = useState("");
  const [multicaixaNumber, setMulticaixaNumber] = useState("");

  useEffect(() => {
    loadProfile();
  }, [user.id]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, phone, withdrawal_method, withdrawal_details, facebook_link, instagram_link, tiktok_link, youtube_link")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          email: data.email || "",
          phone: data.phone || "",
          withdrawal_method: data.withdrawal_method || null,
          withdrawal_details: data.withdrawal_details || null,
          facebook_link: data.facebook_link || null,
          instagram_link: data.instagram_link || null,
          tiktok_link: data.tiktok_link || null,
          youtube_link: data.youtube_link || null,
        });

        // Parse withdrawal details
        if (data.withdrawal_method === "iban" && data.withdrawal_details) {
          const parts = data.withdrawal_details.split(" - ");
          if (parts.length === 2) {
            setIbanBank(parts[0]);
            setIbanNumber(parts[1]);
          }
        } else if (data.withdrawal_method === "multicaixa" && data.withdrawal_details) {
          setMulticaixaNumber(data.withdrawal_details);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  };

  const hasAtLeastOneSocialLink = () => {
    return !!(profile.facebook_link || profile.instagram_link || profile.tiktok_link || profile.youtube_link);
  };

  const handleSave = async () => {
    if (!profile.full_name.trim()) {
      toast.error("Nome completo é obrigatório");
      return;
    }

    if (!profile.phone.trim()) {
      toast.error("Telefone é obrigatório");
      return;
    }

    if (!hasAtLeastOneSocialLink()) {
      toast.error("Pelo menos uma rede social é obrigatória");
      return;
    }

    if (!profile.withdrawal_method) {
      toast.error("Selecione um método de saque");
      return;
    }

    // Validate withdrawal details
    let withdrawalDetails = "";
    if (profile.withdrawal_method === "iban") {
      if (!ibanBank.trim() || !ibanNumber.trim()) {
        toast.error("Preencha o banco e o número IBAN");
        return;
      }
      withdrawalDetails = `${ibanBank.trim()} - ${ibanNumber.trim()}`;
    } else if (profile.withdrawal_method === "multicaixa") {
      if (!multicaixaNumber.trim()) {
        toast.error("Preencha o número Multicaixa Express");
        return;
      }
      withdrawalDetails = multicaixaNumber.trim();
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name.trim(),
          phone: profile.phone.trim(),
          withdrawal_method: profile.withdrawal_method,
          withdrawal_details: withdrawalDetails,
          facebook_link: profile.facebook_link?.trim() || null,
          instagram_link: profile.instagram_link?.trim() || null,
          tiktok_link: profile.tiktok_link?.trim() || null,
          youtube_link: profile.youtube_link?.trim() || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Erro ao salvar perfil");
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
          <CardDescription>
            Atualize seus dados pessoais e de contato
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="Seu nome completo"
              />
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
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+244 9XX XXX XXX"
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Media Links */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" />
            Redes Sociais
          </CardTitle>
          <CardDescription>
            Vincule suas redes sociais para receber tarefas. Pelo menos uma é obrigatória.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="facebook_link" className="flex items-center gap-2">
                <Facebook className="w-4 h-4 text-blue-600" />
                Facebook
              </Label>
              <Input
                id="facebook_link"
                value={profile.facebook_link || ""}
                onChange={(e) => setProfile({ ...profile, facebook_link: e.target.value })}
                placeholder="https://facebook.com/seu.perfil"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram_link" className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-600" />
                Instagram
              </Label>
              <Input
                id="instagram_link"
                value={profile.instagram_link || ""}
                onChange={(e) => setProfile({ ...profile, instagram_link: e.target.value })}
                placeholder="https://instagram.com/seu.perfil"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok_link" className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
                TikTok
              </Label>
              <Input
                id="tiktok_link"
                value={profile.tiktok_link || ""}
                onChange={(e) => setProfile({ ...profile, tiktok_link: e.target.value })}
                placeholder="https://tiktok.com/@seu.perfil"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtube_link" className="flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-600" />
                YouTube
              </Label>
              <Input
                id="youtube_link"
                value={profile.youtube_link || ""}
                onChange={(e) => setProfile({ ...profile, youtube_link: e.target.value })}
                placeholder="https://youtube.com/@seu.canal"
              />
            </div>
          </div>
          {!hasAtLeastOneSocialLink() && (
            <p className="text-sm text-destructive">
              ⚠️ Você precisa vincular pelo menos uma rede social para receber tarefas
            </p>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal Method */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Método de Saque
          </CardTitle>
          <CardDescription>
            Configure como deseja receber seus pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="withdrawal_method">Método de Pagamento</Label>
            <Select
              value={profile.withdrawal_method || ""}
              onValueChange={(value) => setProfile({ ...profile, withdrawal_method: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o método de saque" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="iban">Transferência Bancária (IBAN)</SelectItem>
                <SelectItem value="multicaixa">Multicaixa Express</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {profile.withdrawal_method === "iban" && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="iban_bank">Banco</Label>
                <Select value={ibanBank} onValueChange={setIbanBank}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="BAI">BAI - Banco Angolano de Investimentos</SelectItem>
                    <SelectItem value="BFA">BFA - Banco de Fomento Angola</SelectItem>
                    <SelectItem value="BIC">BIC - Banco Internacional de Crédito</SelectItem>
                    <SelectItem value="BPC">BPC - Banco de Poupança e Crédito</SelectItem>
                    <SelectItem value="BMA">BMA - Banco Millennium Atlântico</SelectItem>
                    <SelectItem value="SOL">Banco SOL</SelectItem>
                    <SelectItem value="Keve">Banco Keve</SelectItem>
                    <SelectItem value="Standard">Standard Bank</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="iban_number">Número IBAN</Label>
                <Input
                  id="iban_number"
                  value={ibanNumber}
                  onChange={(e) => setIbanNumber(e.target.value)}
                  placeholder="AO06 0000 0000 0000 0000 0000 0"
                />
              </div>
            </div>
          )}

          {profile.withdrawal_method === "multicaixa" && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="multicaixa_number">Número Multicaixa Express</Label>
                <Input
                  id="multicaixa_number"
                  value={multicaixaNumber}
                  onChange={(e) => setMulticaixaNumber(e.target.value)}
                  placeholder="9XX XXX XXX"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-lime text-primary-foreground">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default WorkerSettings;
