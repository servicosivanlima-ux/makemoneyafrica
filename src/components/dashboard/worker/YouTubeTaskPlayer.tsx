import { useState, useEffect, useRef } from "react";
import { Youtube, CheckCircle, Clock, Play, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface YouTubeTaskPlayerProps {
    campaign: any;
    taskId: string;
    userId: string;
    onComplete: () => void;
}

const YouTubeTaskPlayer = ({ campaign, taskId, userId, onComplete }: YouTubeTaskPlayerProps) => {
    const [session, setSession] = useState<any>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);

    const requiredTime = Math.min(Math.floor((campaign.duration || 60) * 0.7), 300);
    const progress = Math.min((elapsedTime / requiredTime) * 100, 100);

    const playerRef = useRef<any>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        startSession();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startSession = async () => {
        const token = Math.random().toString(36).substring(7);
        const { data: ipData } = await fetch('https://api.ipify.org?format=json').then(res => res.json()).catch(() => ({ ip: 'unknown' }));

        const { data, error } = await (supabase.rpc as any)('start_video_session', {
            p_campaign_id: campaign.id,
            p_token: token,
            p_ip: ipData.ip
        });

        if (error) {
            toast.error("Erro ao iniciar sessão de vídeo");
            return;
        }

        setSession({ id: data, token });
    };

    useEffect(() => {
        if (isPlaying && elapsedTime < requiredTime) {
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPlaying, elapsedTime, requiredTime]);

    const handleValidate = async () => {
        if (elapsedTime < requiredTime) {
            toast.error(`Assista mais ${requiredTime - elapsedTime} segundos para completar.`);
            return;
        }

        setIsValidating(true);
        try {
            // Logic for Google OAuth subscription check would go here.
            const { data, error } = await (supabase.rpc as any)('validate_video_task', {
                p_session_id: session.id,
                p_token: session.token,
                p_is_subscribed: true // Mocking for now
            });

            const result = data as any;
            if (error || !result?.success) {
                throw new Error(result?.message || error?.message || "Falha na validação");
            }

            toast.success(`Tarefa concluída! Ganhou ${result?.reward} Kz`);
            onComplete();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsValidating(false);
        }
    };

    const videoId = campaign.video_id;

    return (
        <div className="space-y-6">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
                {!isPlaying && elapsedTime === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                        <button
                            onClick={() => setIsPlaying(true)}
                            className="w-20 h-20 rounded-full bg-primary flex items-center justify-center hover:scale-110 transition-transform shadow-neon"
                        >
                            <Play className="w-10 h-10 text-white fill-current" />
                        </button>
                        <p className="mt-4 text-white font-bold uppercase tracking-widest text-xs">Clique para iniciar a tarefa</p>
                    </div>
                ) : (
                    <iframe
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&disablekb=1&modestbranding=1&rel=0`}
                        title="YouTube video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                )}
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Tempo Assistido: {elapsedTime}s / {requiredTime}s
                    </span>
                    <span className={elapsedTime >= requiredTime ? "text-primary" : "text-gold"}>
                        {Math.floor(progress)}% Concluído
                    </span>
                </div>

                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a
                    href={`https://youtube.com/channel/${campaign.channel_id}?sub_confirmation=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsSubscribed(true)}
                    className="flex items-center justify-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-red-600/20 hover:border-red-600/50 transition-all font-bold text-xs uppercase tracking-widest"
                >
                    <Youtube className="w-5 h-5 text-red-600" />
                    Subscrever Canal
                </a>

                <button
                    onClick={handleValidate}
                    disabled={elapsedTime < requiredTime || isValidating}
                    className="btn-primary"
                >
                    {isValidating ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Concluir Tarefa
                        </>
                    )}
                </button>
            </div>

            {elapsedTime < requiredTime && (
                <div className="p-4 bg-gold/10 border border-gold/20 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-gold shrink-0" />
                    <p className="text-[10px] font-bold text-gold uppercase tracking-tight">
                        NÃO FECHE O VÍDEO. A recompensa só será libertada após o contador chegar a zero.
                    </p>
                </div>
            )}
        </div>
    );
};

export default YouTubeTaskPlayer;
