import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronRight, CheckCircle2, AlertCircle, Loader2, User, Landmark, Phone, AlertTriangle, X, ImageIcon, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WorkerVerificationProps {
    profile: any;
    onComplete: () => void;
}

const WorkerVerification = ({ profile, onComplete }: WorkerVerificationProps) => {
    const [step, setStep] = useState<1 | 2>(profile.worker_status === 'id_verified' ? 2 : 1);
    const [loading, setLoading] = useState(false);
    const [showFraudModal, setShowFraudModal] = useState(false);
    const [kycStatus, setKycStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>(profile.kyc_status || 'none');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Identity Form
    const [docType, setDocType] = useState("BI");
    const [docNumber, setDocNumber] = useState("");
    const [docName, setDocName] = useState(profile.full_name || "");
    const [docImage, setDocImage] = useState<File | null>(null);
    const [docImagePreview, setDocImagePreview] = useState<string | null>(null);

    // Withdrawal Form
    const [withdrawType, setWithdrawType] = useState<"iban" | "express">("iban");
    const [holderName, setHolderName] = useState(profile.full_name || "");
    const [identifier, setIdentifier] = useState("");
    const [bankName, setBankName] = useState("");

    // Effects
    useEffect(() => {
        const checkExistingKyc = async () => {
            const { data } = await (supabase as any)
                .from('kyc_documents')
                .select('status')
                .eq('user_id', profile.user_id)
                .maybeSingle();

            if (data?.status) {
                setKycStatus(data.status as any);
            }
        };
        checkExistingKyc();
    }, [profile.user_id]);

    // Handle image file selection
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            toast.error("Formato inválido! Apenas JPG e PNG são aceites.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Imagem muito grande! Máximo 5MB.");
            return;
        }

        setDocImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setDocImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleKycSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!docNumber || !docName || !docImage) {
            toast.error("Preencha todos os campos e carregue a foto");
            return;
        }

        setLoading(true);
        try {
            if (!profile?.id) throw new Error("Perfil não encontrado.");

            // Upload image to Supabase Storage
            const fileName = `${profile.user_id}/${Date.now()}_${docImage.name}`;
            const { error: uploadError } = await supabase.storage
                .from('kyc-documents')
                .upload(fileName, docImage);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('kyc-documents')
                .getPublicUrl(fileName);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) throw new Error("Sessão não encontrada. Por favor, faça login novamente.");

            const { error } = await (supabase as any)
                .from('kyc_documents')
                .insert({
                    user_id: session.user.id,
                    profile_id: profile.id,
                    doc_type: docType,
                    doc_number: docNumber,
                    doc_country: 'AO',
                    doc_name: docName,
                    doc_image_url: urlData.publicUrl,
                    status: 'pending',
                    verified: false
                });

            if (error) {
                console.error("Supabase Insert Error:", error);
                if (error.code === '42501') {
                    throw new Error("Erro de Segurança (RLS): O servidor bloqueou a gravação. Por favor, execute o script SQL de correção definitiva.");
                }
                if (error.code === '23505') {
                    throw new Error("Este número de documento já está em uso no sistema.");
                }
                throw error;
            }

            toast.success("Documento enviado para revisão!");
            setKycStatus('pending');
        } catch (error: any) {
            console.error("KYC Error:", error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleWithdrawSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identifier || !holderName) {
            toast.error("Preencha os dados de levantamento");
            return;
        }

        setLoading(true);
        try {
            const { data: existingMethod } = await (supabase as any)
                .from('withdraw_methods')
                .select('id, user_id')
                .eq('identifier', identifier)
                .neq('user_id', profile.user_id)
                .maybeSingle();

            if (existingMethod) {
                await (supabase as any)
                    .from('profiles')
                    .update({
                        is_blocked: true,
                        blocked_reason: 'Tentativa de fraude: método de levantamento duplicado'
                    })
                    .eq('user_id', profile.user_id);

                setLoading(false);
                setShowFraudModal(true);
                return;
            }

            const { error } = await (supabase as any)
                .from('withdraw_methods')
                .insert({
                    user_id: profile.user_id,
                    profile_id: profile.id,
                    type: withdrawType,
                    holder_name: holderName,
                    identifier: identifier,
                    bank_name: bankName,
                    verified: true
                });

            if (error) throw error;

            toast.success("Método de levantamento registado com sucesso!");
            onComplete();
        } catch (error: any) {
            console.error("Withdraw Error:", error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFraudModalClose = async () => {
        await supabase.auth.signOut();
        window.location.href = "https://wa.me/244923066682?text=Olá,%20minha%20conta%20foi%20bloqueada.%20Preciso%20de%20ajuda.";
    };

    if (kycStatus === 'pending') {
        return (
            <div className="card-premium-glow p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto border border-gold/20 animate-pulse">
                    <Clock className="w-8 h-8 text-gold" />
                </div>
                <div>
                    <h2 className="text-xl font-black font-display text-white uppercase tracking-widest mb-2">Documentos em Análise</h2>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        A sua documentação foi enviada e está em revisão. Isso pode levar até 24h ou menos.
                    </p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl text-xs text-muted-foreground italic">
                    Você será notificado (a) assim que sua conta for activada para levantamentos.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-2">
                    <Shield className="w-3 h-3" />
                    Verificação Obrigatória para Iniciar Levantamentos
                </div>
                <h2 className="text-2xl font-black font-display text-white uppercase tracking-widest">Activação de Conta</h2>
                <p className="text-sm text-muted-foreground">Siga os passos abaixo para habilitar os seus levantamentos</p>
            </div>

            {/* Steps Indicator */}
            <div className="flex items-center justify-center gap-4 max-w-xs mx-auto mb-8">
                <div className={`flex flex-col items-center gap-2 ${step === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${step === 1 ? 'border-primary bg-primary/20 font-bold' : 'border-white/10'}`}>1</div>
                    <span className="text-[10px] font-black uppercase tracking-tighter">Identidade</span>
                </div>
                <div className="w-12 h-[2px] bg-white/5 mb-6" />
                <div className={`flex flex-col items-center gap-2 ${step === 2 ? 'text-gold' : 'text-muted-foreground'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${step === 2 ? 'border-gold bg-gold/20 font-bold' : 'border-white/10'}`}>2</div>
                    <span className="text-][10px] font-black uppercase tracking-tighter">Levantamento</span>
                </div>
            </div>

            <div className="max-w-md mx-auto">
                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.form
                            key="kyc"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onSubmit={handleKycSubmit}
                            className="card-premium-glow p-8 space-y-6"
                        >
                            {kycStatus === 'rejected' && (
                                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl flex items-start gap-4 mb-4">
                                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                                    <p className="text-xs text-destructive font-medium">
                                        A sua verificação anterior foi rejeitada. Por favor, envie uma foto mais nítida.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo de Documento</label>
                                    <select
                                        value={docType}
                                        onChange={(e) => setDocType(e.target.value)}
                                        className="input-premium w-full bg-white/5"
                                    >
                                        <option value="BI">Bilhete de Identidade (Angola)</option>
                                        <option value="Passport">Passaporte</option>
                                        <option value="Driving_License">Carta de Condução</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Número do Documento</label>
                                    <input
                                        type="text"
                                        value={docNumber}
                                        onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
                                        className="input-premium"
                                        placeholder="Digite o número do documento"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo (como no documento)</label>
                                    <input
                                        type="text"
                                        value={docName}
                                        onChange={(e) => setDocName(e.target.value)}
                                        className="input-premium"
                                        placeholder="Nome completo"
                                        required
                                    />
                                </div>

                                {/* Document Image Upload */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                        Foto do Documento (JPG ou PNG)
                                    </label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".jpg,.jpeg,.png"
                                        onChange={handleImageSelect}
                                        className="hidden"
                                    />

                                    {!docImagePreview ? (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full h-40 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                                        >
                                            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
                                                <ImageIcon className="w-7 h-7 text-muted-foreground" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-muted-foreground">Clique para carregar</p>
                                                <p className="text-[10px] text-muted-foreground/60">Apenas JPG e PNG (máx. 5MB)</p>
                                            </div>
                                        </button>
                                    ) : (
                                        <div className="relative">
                                            <img
                                                src={docImagePreview}
                                                alt="Preview do documento"
                                                className="w-full h-48 object-cover rounded-xl border border-white/10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDocImage(null);
                                                    setDocImagePreview(null);
                                                }}
                                                className="absolute top-2 right-2 w-8 h-8 bg-destructive rounded-full flex items-center justify-center hover:bg-destructive/80 transition-all"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <div className="absolute bottom-2 left-2 px-3 py-1 bg-primary/80 backdrop-blur-sm rounded-full">
                                                <p className="text-[10px] font-black uppercase text-primary-foreground">Imagem carregada</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn-premium w-full h-14 flex items-center justify-center gap-3 text-sm"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                            <>
                                                Enviar Documento
                                                <ChevronRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                    <p className="text-[10px] text-muted-foreground mt-4 text-center italic">
                                        Revisão manual necessária para garantir segurança nos pagamentos.
                                    </p>
                                </div>
                            </div>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="withdraw"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onSubmit={handleWithdrawSubmit}
                            className="card-premium-glow p-8 space-y-6 border-gold/30 shadow-gold-premium"
                        >
                            <div className="bg-gold/10 border border-gold/20 p-4 rounded-xl flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center shrink-0">
                                    <Shield className="w-6 h-6 text-gold" />
                                </div>
                                <p className="text-xs text-gold font-medium leading-relaxed">
                                    Por segurança, o método de levantamento <b>deve estar no seu nome</b> (titular do documento).
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setWithdrawType("iban")}
                                    className={`p-5 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${withdrawType === "iban" ? "bg-gold/20 border-gold/40 text-gold shadow-gold-premium/20" : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"}`}
                                >
                                    <Landmark className="w-6 h-6" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">IBAN Bancário</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setWithdrawType("express")}
                                    className={`p-5 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${withdrawType === "express" ? "bg-gold/20 border-gold/40 text-gold shadow-gold-premium/20" : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"}`}
                                >
                                    <Phone className="w-6 h-6" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">MCX Express</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Titular da Conta (Auto-preenchido)</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/50" />
                                        <input
                                            type="text"
                                            value={holderName}
                                            className="input-premium pl-11 opacity-50 cursor-not-allowed"
                                            disabled
                                        />
                                    </div>
                                </div>

                                {withdrawType === "iban" ? (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Banco</label>
                                            <input
                                                type="text"
                                                value={bankName}
                                                onChange={(e) => setBankName(e.target.value)}
                                                className="input-premium"
                                                placeholder="Ex: BFA, BIC, Banco Sol..."
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Número do IBAN</label>
                                            <input
                                                type="text"
                                                value={identifier}
                                                onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                                                className="input-premium"
                                                placeholder="AO06 0000 0000 0000 0000 0"
                                                required
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Telemóvel do Express</label>
                                        <input
                                            type="text"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            className="input-premium"
                                            placeholder="9xx xxx xxx"
                                            required
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-premium w-full h-14 bg-gold hover:bg-gold/80 text-gold-foreground flex items-center justify-center gap-3 text-sm mt-6 shadow-gold-premium font-black uppercase tracking-widest"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            Finalizar Activação
                                            <CheckCircle2 className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>
            </div>

            {/* Fraud Modal */}
            <AnimatePresence>
                {showFraudModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-card-elevated border border-destructive/20 p-8 rounded-2xl max-w-sm text-center space-y-6 shadow-2xl"
                        >
                            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                                <AlertTriangle className="w-10 h-10 text-destructive" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-white uppercase tracking-widest">Fraude Detectada</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Este método de pagamento já está associado a outra conta. Sua conta foi bloqueada preventivamente.
                                </p>
                            </div>
                            <button
                                onClick={handleFraudModalClose}
                                className="w-full h-12 bg-destructive text-white rounded-xl font-bold hover:bg-destructive/90 transition-all shadow-lg"
                            >
                                Entrar em Contato com Suporte
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WorkerVerification;
