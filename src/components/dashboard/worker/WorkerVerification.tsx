import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronRight, CheckCircle2, AlertCircle, Loader2, User, Landmark, Phone, AlertTriangle, X, ImageIcon, Clock, Camera, QrCode, Smartphone, RotateCcw, Upload, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateIBAN, formatIBAN } from "@/lib/currency-utils";
import { QRCodeSVG } from "qrcode.react";

interface WorkerVerificationProps {
    profile: any;
    onComplete: () => void;
}

const WorkerVerification = ({ profile, onComplete }: WorkerVerificationProps) => {
    const [step, setStep] = useState<1 | 2 | 3>(profile.worker_status === 'id_verified' ? 3 : 1);
    const [loading, setLoading] = useState(false);
    const [showFraudModal, setShowFraudModal] = useState(false);
    const [kycStatus, setKycStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>(profile.kyc_status || 'none');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const selfieFileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Identity Form
    const [docType, setDocType] = useState("National_ID");
    const [docCountry, setDocCountry] = useState("AO");
    const [docNumber, setDocNumber] = useState("");
    const [docName, setDocName] = useState(profile.full_name || "");
    const [docImage, setDocImage] = useState<File | null>(null);
    const [docImagePreview, setDocImagePreview] = useState<string | null>(null);

    // Selfie Form
    const [selfieMode, setSelfieMode] = useState<"choose" | "camera" | "qr" | "preview">("choose");
    const [selfieImage, setSelfieImage] = useState<File | null>(null);
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [qrSyncDone, setQrSyncDone] = useState(false);
    const [selfieSubmitted, setSelfieSubmitted] = useState(false);

    // Withdrawal Form
    const [withdrawType, setWithdrawType] = useState<"iban" | "express">("iban");
    const [holderName, setHolderName] = useState(profile.full_name || "");
    const [identifier, setIdentifier] = useState("");
    const [bankName, setBankName] = useState("");

    // QR Code URL
    const qrUrl = typeof window !== "undefined"
        ? `${window.location.origin}/verify-mobile?uid=${profile.user_id}&token=${Date.now()}`
        : "";

    // Effects
    useEffect(() => {
        const checkExistingKyc = async () => {
            const { data } = await (supabase as any)
                .from('kyc_documents')
                .select('status, selfie_url')
                .eq('user_id', profile.user_id)
                .maybeSingle();

            if (data?.status) {
                setKycStatus(data.status as any);
            }
        };
        checkExistingKyc();
    }, [profile.user_id]);

    // Realtime listener for QR sync
    useEffect(() => {
        if (selfieMode !== "qr") return;

        const channel = supabase
            .channel('kyc-selfie-sync')
            .on(
                'postgres_changes' as any,
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'kyc_documents',
                    filter: `user_id=eq.${profile.user_id}`
                },
                (payload: any) => {
                    if (payload.new?.selfie_url) {
                        setSelfiePreview(payload.new.selfie_url);
                        setQrSyncDone(true);
                        setSelfieMode("preview");
                        toast.success("Selfie sincronizada do telemóvel!");
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selfieMode, profile.user_id]);

    // Camera functions
    const startCamera = useCallback(async () => {
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setCameraActive(true);
            }
        } catch {
            setCameraActive(false);
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
            setCameraActive(false);
        }
    }, []);

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setSelfiePreview(dataUrl);
        setSelfieMode("preview");
        stopCamera();
    };

    // Cleanup camera on unmount
    useEffect(() => {
        return () => stopCamera();
    }, [stopCamera]);

    // Handle document image file selection
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

    // Handle selfie file selection
    const handleSelfieFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            toast.error("Formato inválido! Apenas JPG e PNG.");
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            toast.error("Imagem muito grande! Máximo 8MB.");
            return;
        }

        setSelfieImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setSelfiePreview(reader.result as string);
            setSelfieMode("preview");
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

            // Upload document image
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
                    doc_country: docCountry,
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

            toast.success("Documento registado! Agora envie a selfie.");
            setStep(2);
        } catch (error: any) {
            console.error("KYC Error:", error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelfieSubmit = async () => {
        if (selfieSubmitted) return;
        if (selfieMode !== "preview" || !selfiePreview) {
            toast.error("Capture ou selecione uma selfie primeiro.");
            return;
        }

        setSelfieSubmitted(true);
        setLoading(true);
        try {
            // If synced from mobile (qrSyncDone), the selfie_url was already set in the database
            if (qrSyncDone) {
                toast.success("Selfie enviada com sucesso! Aguardando análise.");
                setKycStatus('pending');
                setLoading(false);
                return;
            }

            // Upload selfie image
            let blob: Blob;
            if (selfieImage) {
                blob = selfieImage;
            } else {
                // Convert data URL to Blob
                const res = await fetch(selfiePreview);
                blob = await res.blob();
            }

            const fileName = `${profile.user_id}/selfie_${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage
                .from('kyc-documents')
                .upload(fileName, blob, { contentType: 'image/jpeg' });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('kyc-documents')
                .getPublicUrl(fileName);

            // Update the kyc_documents record with the selfie URL
            const { error: updateError } = await (supabase as any)
                .from('kyc_documents')
                .update({ selfie_url: urlData.publicUrl })
                .eq('user_id', profile.user_id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (updateError) throw updateError;

            toast.success("Selfie enviada com sucesso! Aguardando análise.");
            setKycStatus('pending');
        } catch (error: any) {
            console.error("Selfie Error:", error);
            toast.error(error.message);
            setSelfieSubmitted(false);
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

        if (withdrawType === "iban") {
            const validation = validateIBAN(identifier, profile?.country || "AO");
            if (!validation.isValid) {
                toast.error(validation.error);
                setLoading(false);
                return;
            }
        }

        const finalIdentifier = withdrawType === "iban"
            ? formatIBAN(identifier, profile?.country || "AO")
            : identifier;

        setLoading(true);
        try {
            const { data: existingMethod } = await (supabase as any)
                .from('withdraw_methods')
                .select('id, user_id')
                .eq('identifier', finalIdentifier)
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
                    identifier: finalIdentifier,
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
                        A sua documentação e selfie foram enviadas e estão em revisão. Isso pode levar até 24h ou menos.
                    </p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl text-xs text-muted-foreground italic">
                    Você será notificado (a) assim que sua conta for activada para levantamentos.
                </div>
            </div>
        );
    }

    // Step labels for indicator
    const steps = [
        { num: 1, label: "Identidade", active: step === 1 },
        { num: 2, label: "Selfie", active: step === 2 },
        { num: 3, label: "Levantamento", active: step === 3 },
    ];

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
            <div className="flex items-center justify-center gap-3 max-w-md mx-auto mb-8">
                {steps.map((s, i) => (
                    <div key={s.num} className="flex items-center gap-3">
                        <div className={`flex flex-col items-center gap-2 ${s.active ? (s.num === 3 ? 'text-gold' : 'text-primary') : step > s.num ? 'text-green-500' : 'text-muted-foreground'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${s.active ? (s.num === 3 ? 'border-gold bg-gold/20 font-bold' : 'border-primary bg-primary/20 font-bold') :
                                step > s.num ? 'border-green-500 bg-green-500/20' : 'border-white/10'
                                }`}>
                                {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-tighter">{s.label}</span>
                        </div>
                        {i < steps.length - 1 && <div className="w-8 h-[2px] bg-white/5 mb-6" />}
                    </div>
                ))}
            </div>

            <div className="max-w-md mx-auto">
                <AnimatePresence mode="wait">
                    {/* STEP 1: Document */}
                    {step === 1 && (
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
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">País do Documento</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <select
                                            value={docCountry}
                                            onChange={(e) => setDocCountry(e.target.value)}
                                            className="input-premium pl-11 w-full bg-white/5 appearance-none cursor-pointer"
                                        >
                                            <option value="AO" className="bg-background">Angola (+244)</option>
                                            <option value="PT" className="bg-background">Portugal (+351)</option>
                                            <option value="BR" className="bg-background">Brasil (+55)</option>
                                            <option value="MZ" className="bg-background">Moçambique (+258)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo de Documento</label>
                                    <select
                                        value={docType}
                                        onChange={(e) => setDocType(e.target.value)}
                                        className="input-premium w-full bg-white/5"
                                    >
                                        <option value="National_ID">📄 Documento de Identidade Nacional</option>
                                        <option value="Passport">🛂 Passaporte</option>
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
                                                Próximo: Selfie
                                                <ChevronRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.form>
                    )}

                    {/* STEP 2: Selfie */}
                    {step === 2 && (
                        <motion.div
                            key="selfie"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="card-premium-glow p-8 space-y-6"
                        >
                            <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl space-y-2">
                                <p className="text-xs font-bold text-primary flex items-center gap-2">
                                    <Camera className="w-4 h-4" /> Verificação Facial Anti-Fraude
                                </p>
                                <ul className="text-[11px] text-muted-foreground space-y-1">
                                    <li>• Rosto centralizado e bem iluminado</li>
                                    <li>• Sem óculos de sol, chapéu ou máscara</li>
                                    <li>• Expressão natural (olhe para a câmera)</li>
                                    <li>• Fundo neutro, sem outras pessoas</li>
                                </ul>
                            </div>

                            <AnimatePresence mode="wait">
                                {/* Choose mode */}
                                {selfieMode === "choose" && (
                                    <motion.div
                                        key="choose"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-3"
                                    >
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Escolha como tirar a sua selfie:</p>

                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setSelfieMode("camera");
                                                await startCamera();
                                            }}
                                            className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-primary/10 hover:border-primary/30 transition-all flex items-center gap-4 group"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:shadow-neon transition-all">
                                                <Camera className="w-6 h-6 text-primary" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-foreground">Usar Câmera do PC</p>
                                                <p className="text-[10px] text-muted-foreground">Tire a selfie directamente pela webcam</p>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setSelfieMode("qr")}
                                            className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-gold/10 hover:border-gold/30 transition-all flex items-center gap-4 group"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center group-hover:shadow-gold-premium transition-all">
                                                <QrCode className="w-6 h-6 text-gold" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-foreground">Usar Telemóvel</p>
                                                <p className="text-[10px] text-muted-foreground">Digitalize o QR code com o smartphone</p>
                                            </div>
                                        </button>

                                        <div className="relative flex items-center gap-4 pt-2">
                                            <div className="flex-1 h-px bg-white/10" />
                                            <span className="text-[9px] text-muted-foreground uppercase tracking-widest">ou</span>
                                            <div className="flex-1 h-px bg-white/10" />
                                        </div>

                                        <input
                                            ref={selfieFileInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png"
                                            onChange={handleSelfieFileSelect}
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => selfieFileInputRef.current?.click()}
                                            className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                                        >
                                            <Upload className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-xs font-bold text-muted-foreground">Carregar imagem da galeria</span>
                                        </button>
                                    </motion.div>
                                )}

                                {/* Camera mode */}
                                {selfieMode === "camera" && (
                                    <motion.div
                                        key="camera-view"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-4"
                                    >
                                        <div className="relative aspect-[3/4] bg-black rounded-3xl overflow-hidden border-2 border-white/10">
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="w-full h-full object-cover scale-x-[-1]"
                                            />
                                            {/* Face Guide */}
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="w-44 h-56 border-2 border-dashed border-primary/50 rounded-[50%] animate-pulse" />
                                            </div>

                                            {!cameraActive && (
                                                <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center gap-4">
                                                    <Camera className="w-12 h-12 text-muted-foreground" />
                                                    <p className="text-xs text-muted-foreground text-center px-4">
                                                        Câmera não disponível.<br />
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelfieMode("qr")}
                                                            className="text-primary underline mt-2"
                                                        >
                                                            Use o seu telemóvel
                                                        </button>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <canvas ref={canvasRef} className="hidden" />

                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => { stopCamera(); setSelfieMode("choose"); }}
                                                className="flex-none p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                                            >
                                                <X className="w-5 h-5 text-muted-foreground" />
                                            </button>
                                            {cameraActive && (
                                                <button
                                                    type="button"
                                                    onClick={capturePhoto}
                                                    className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:shadow-neon transition-all active:scale-95"
                                                >
                                                    <Camera className="w-5 h-5" />
                                                    Capturar Selfie
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                                {/* QR mode */}
                                {selfieMode === "qr" && (
                                    <motion.div
                                        key="qr-view"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-5"
                                    >
                                        <div className="text-center space-y-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gold">Passo 1: Abra a câmera do telemóvel</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gold">Passo 2: Digitalize o código abaixo</p>
                                        </div>

                                        <div className="flex justify-center">
                                            <div className="p-5 bg-white rounded-3xl shadow-2xl">
                                                <QRCodeSVG
                                                    value={qrUrl}
                                                    size={200}
                                                    level="H"
                                                    includeMargin={false}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                Aguardando sincronização...
                                            </p>
                                        </div>

                                        <div className="bg-white/5 p-4 rounded-xl text-xs text-muted-foreground space-y-2">
                                            <p className="font-bold text-foreground flex items-center gap-2">
                                                <Smartphone className="w-3.5 h-3.5 text-gold" /> Como funciona:
                                            </p>
                                            <ol className="list-decimal list-inside space-y-1 text-[11px]">
                                                <li>Abra a câmera do seu telemóvel</li>
                                                <li>Aponte para o QR Code acima</li>
                                                <li>Tire a selfie no telemóvel</li>
                                                <li>Esta página será actualizada automaticamente</li>
                                            </ol>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setSelfieMode("choose")}
                                            className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-bold text-muted-foreground"
                                        >
                                            ← Voltar
                                        </button>
                                    </motion.div>
                                )}

                                {/* Preview mode */}
                                {selfieMode === "preview" && selfiePreview && (
                                    <motion.div
                                        key="preview-view"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-4"
                                    >
                                        <div className="relative aspect-[3/4] bg-black rounded-3xl overflow-hidden border-2 border-green-500/30">
                                            <img
                                                src={selfiePreview}
                                                alt="Selfie preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-green-500/80 backdrop-blur-sm rounded-full">
                                                <p className="text-[10px] font-black uppercase text-white tracking-widest">
                                                    {qrSyncDone ? "📱 Sincronizada" : "✔ Capturada"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            {!qrSyncDone && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelfiePreview(null);
                                                        setSelfieImage(null);
                                                        setSelfieMode("choose");
                                                    }}
                                                    className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 text-foreground font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                    Repetir
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={handleSelfieSubmit}
                                                disabled={loading}
                                                className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:shadow-neon transition-all"
                                            >
                                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                                    <>
                                                        Enviar Selfie
                                                        <ChevronRight className="w-5 h-5" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <p className="text-[10px] text-muted-foreground text-center italic">
                                A selfie será comparada com o documento para validação humana pelo administrador.
                            </p>
                        </motion.div>
                    )}

                    {/* STEP 3: Withdrawal Method */}
                    {step === 3 && (
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
