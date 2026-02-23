import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Upload, CheckCircle2, Loader2, AlertCircle, RotateCcw, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSearchParams, useNavigate } from "react-router-dom";

const VerificationMobile = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const userId = searchParams.get("uid");
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"camera" | "preview" | "uploading" | "done" | "error">("camera");
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
    const [cameraActive, setCameraActive] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // File input for gallery fallback
    const fileInputRef = useRef<HTMLInputElement>(null);

    const startCamera = useCallback(async () => {
        try {
            // Stop existing stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: cameraFacing,
                    width: { ideal: 720 },
                    height: { ideal: 960 }
                }
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setCameraActive(true);
            }
        } catch (err: any) {
            console.error("Camera error:", err);
            setCameraActive(false);
            // Camera not available - show file upload as fallback
        }
    }, [cameraFacing]);

    useEffect(() => {
        startCamera();
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, [startCamera]);

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Mirror for selfie camera
        if (cameraFacing === "user") {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setCapturedImage(dataUrl);
        setStatus("preview");

        // Stop camera while previewing
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            setCameraActive(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ["image/jpeg", "image/png", "image/jpg"];
        if (!validTypes.includes(file.type)) {
            toast.error("Formato inválido! Apenas JPG e PNG.");
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            toast.error("Imagem muito grande! Máximo 8MB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setCapturedImage(reader.result as string);
            setStatus("preview");
        };
        reader.readAsDataURL(file);
    };

    const retake = async () => {
        setCapturedImage(null);
        setStatus("camera");
        await startCamera();
    };

    const uploadSelfie = async () => {
        if (!capturedImage || !userId) return;
        setStatus("uploading");

        try {
            // Convert data URL to Blob
            const res = await fetch(capturedImage);
            const blob = await res.blob();
            const fileName = `${userId}/selfie_${Date.now()}.jpg`;

            const { error: uploadError } = await supabase.storage
                .from("kyc-documents")
                .upload(fileName, blob, { contentType: "image/jpeg" });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from("kyc-documents")
                .getPublicUrl(fileName);

            // Update kyc_documents with selfie_url
            const { error: updateError } = await (supabase as any)
                .from("kyc_documents")
                .update({ selfie_url: urlData.publicUrl })
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(1);

            if (updateError) throw updateError;

            setStatus("done");
        } catch (error: any) {
            console.error("Upload error:", error);
            setErrorMsg(error.message || "Erro ao enviar selfie");
            setStatus("error");
        }
    };

    if (!userId) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
                    <h1 className="text-xl font-black text-foreground uppercase tracking-widest">Link Inválido</h1>
                    <p className="text-sm text-muted-foreground">Este link de verificação é inválido ou expirou.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="p-4 border-b border-white/10 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                        <Smartphone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-foreground uppercase tracking-widest">Verificação Facial</h1>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Make Money Africa</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center p-4">
                {status === "camera" && (
                    <div className="w-full max-w-sm space-y-4">
                        {/* Instructions */}
                        <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl space-y-2">
                            <p className="text-xs font-bold text-primary">📸 Instruções para a Selfie:</p>
                            <ul className="text-[11px] text-muted-foreground space-y-1">
                                <li>• Rosto centrado e bem iluminado</li>
                                <li>• Sem óculos de sol ou máscara</li>
                                <li>• Expressão natural (frente)</li>
                                <li>• Fundo neutro, sem outras pessoas</li>
                            </ul>
                        </div>

                        {/* Camera View */}
                        <div className="relative aspect-[3/4] bg-black rounded-3xl overflow-hidden border-2 border-white/10">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-cover ${cameraFacing === "user" ? "scale-x-[-1]" : ""}`}
                            />

                            {/* Face Guide Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-48 h-64 border-2 border-dashed border-primary/60 rounded-[50%] animate-pulse" />
                            </div>

                            {/* Camera not available - show upload option */}
                            {!cameraActive && (
                                <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center gap-4">
                                    <Camera className="w-12 h-12 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground text-center px-4">
                                        Câmera não disponível.<br />Use o botão abaixo para selecionar da galeria.
                                    </p>
                                </div>
                            )}
                        </div>

                        <canvas ref={canvasRef} className="hidden" />

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            {cameraActive && (
                                <>
                                    <button
                                        onClick={() => setCameraFacing(f => f === "user" ? "environment" : "user")}
                                        className="flex-none p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                                        title="Trocar câmera"
                                    >
                                        <RotateCcw className="w-5 h-5 text-muted-foreground" />
                                    </button>
                                    <button
                                        onClick={capturePhoto}
                                        className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:shadow-neon transition-all active:scale-95"
                                    >
                                        <Camera className="w-5 h-5" />
                                        Capturar Selfie
                                    </button>
                                </>
                            )}

                            {/* File Upload Fallback */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png"
                                capture="user"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className={`${cameraActive ? "flex-none" : "flex-1"} h-14 rounded-2xl bg-white/5 border border-white/10 text-foreground font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-95`}
                            >
                                <Upload className="w-4 h-4" />
                                {cameraActive ? "" : "Selecionar da Galeria"}
                            </button>
                        </div>
                    </div>
                )}

                {status === "preview" && capturedImage && (
                    <div className="w-full max-w-sm space-y-4">
                        <div className="relative aspect-[3/4] bg-black rounded-3xl overflow-hidden border-2 border-primary/30">
                            <img
                                src={capturedImage}
                                alt="Selfie preview"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-primary/80 backdrop-blur-sm rounded-full">
                                <p className="text-[10px] font-black uppercase text-primary-foreground tracking-widest">Pré-visualização</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={retake}
                                className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 text-foreground font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Repetir
                            </button>
                            <button
                                onClick={uploadSelfie}
                                className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:shadow-neon transition-all"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                Confirmar
                            </button>
                        </div>
                    </div>
                )}

                {status === "uploading" && (
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-foreground uppercase tracking-widest">A Enviar...</h2>
                            <p className="text-xs text-muted-foreground mt-1">A sua selfie está a ser processada.</p>
                        </div>
                    </div>
                )}

                {status === "done" && (
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                            <CheckCircle2 className="w-10 h-10 text-green-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-foreground uppercase tracking-widest">Selfie Enviada!</h2>
                            <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
                                Pode fechar esta página e voltar ao seu computador. O painel será actualizado automaticamente.
                            </p>
                        </div>
                    </div>
                )}

                {status === "error" && (
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto border border-destructive/20">
                            <AlertCircle className="w-10 h-10 text-destructive" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-foreground uppercase tracking-widest">Erro</h2>
                            <p className="text-xs text-muted-foreground mt-2">{errorMsg}</p>
                        </div>
                        <button
                            onClick={retake}
                            className="px-8 h-12 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs hover:shadow-neon transition-all"
                        >
                            Tentar Novamente
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="p-4 border-t border-white/10 text-center">
                <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest">
                    Ambiente seguro · Dados protegidos · MMWL © 2026
                </p>
            </footer>
        </div>
    );
};

export default VerificationMobile;
