import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User as UserIcon, Building2, Phone, Mail, Save, Loader2, Lock, Eye, EyeOff } from "lucide-react";

interface ClientSettingsProps {
  user: User;
}

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  account_type: string | null;
  company_name: string | null;
  country: string;
}

const ClientSettings = ({ user }: ClientSettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    email: "",
    phone: "",
    account_type: "personal",
    company_name: null,
    country: "AO",
  });

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user.id]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, phone, account_type, company_name, country")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          email: data.email || "",
          phone: data.phone || "",
          account_type: data.account_type || "personal",
          company_name: data.company_name || null,
          country: data.country || "AO",
        });
      }
    } finally {
      setLoading(false);
    }
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
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
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
                disabled
                className="bg-muted"
                placeholder="Primeiro e último nome"
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="country">País de Residência</Label>
              <Select
                value={profile.country}
                onValueChange={(value) => setProfile({ ...profile, country: value })}
                disabled // Standard client settings seem read-only except password
              >
                <SelectTrigger id="country" className="bg-muted opacity-50 cursor-not-allowed">
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
              <Label htmlFor="phone">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={profile.phone}
                  disabled
                  className="pl-10 bg-muted"
                  placeholder="+244 9XX XXX XXX"
                />
              </div>
            </div>
          </div>
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
              <Label htmlFor="new_password">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new_password"
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
              <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirm_password"
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

export default ClientSettings;
