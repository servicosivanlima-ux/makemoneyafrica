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
    const [workerProfile, setWorkerProfile] = useState<any>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('youtube_link, full_name')
                    .eq('user_id', userId)
                    .single();

                if (error) throw error;
                setWorkerProfile(data);
            } catch (err) {
                console.error("Error fetching profile:", err);
            } finally {
                setLoadingProfile(false);
            }
        };

        fetchProfile();
    }, [userId]);

    const isHabilitated = !!workerProfile?.youtube_link;
    const channelName = workerProfile?.youtube_link?.split('/').pop() || workerProfile?.full_name;

    const requiredTime = campaign.video_duration || campaign.duration || 60;
    const progress = Math.min((elapsedTime / requiredTime) * 100, 100);

    // 60s = 10kz rule -> 0.1666... kz/sec
    const rewardPerSecond = campaign.reward_per_second || (10 / 60);
    const currentEarnings = (elapsedTime * rewardPerSecond).toFixed(2);

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
            toast.error(error.message || "Erro ao iniciar sessão de vídeo");
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
            {!loadingProfile && (
                <div className={`p-4 rounded-2xl border flex items-center gap-4 transition-all duration-700 animate-in fade-in slide-in-from-top-4 ${isHabilitated ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className={`p-3 rounded-xl ${isHabilitated ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        <Youtube className={`w-5 h-5 ${isHabilitated ? 'text-green-500' : 'text-red-500'}`} />
                    </div>
                    <div className="flex-1">
                        {isHabilitated ? (
                            <>
                                <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-0.5">Parabéns! Estás habilitado</p>
                                <p className="text-xs text-white font-bold">Canal: <span className="text-primary italic">{channelName}</span></p>
                            </>
                        ) : (
                            <>
                                <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-0.5">Conta YouTube necessária</p>
                                <p className="text-xs text-muted-foreground leading-tight">Precisas de ter uma conta YouTube activa no teu perfil para fazer esta tarefa.</p>
                            </>
                        )}
                    </div>
                    {isHabilitated && <CheckCircle className="w-6 h-6 text-green-500 animate-pulse" />}
                </div>
            )}

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
                {!isHabilitated && !loadingProfile && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
                        <div className="text-center p-8">
                            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-white font-bold mb-2 text-lg">Acesso Restrito</h3>
                            <p className="text-muted-foreground text-xs max-w-[200px] mx-auto">Vincula o teu canal do YouTube nas definições para desbloquear esta tarefa.</p>
                        </div>
                    </div>
                )}
                {!isPlaying && elapsedTime === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                        <button
                            onClick={() => isHabilitated && setIsPlaying(true)}
                            disabled={!isHabilitated}
                            className="w-20 h-20 rounded-full bg-primary flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-neon disabled:opacity-50 disabled:grayscale"
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

            <div className="bg-card/40 border border-border p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 h-1 bg-primary/20 w-full" />
                <div
                    className="absolute top-0 left-0 h-1 bg-primary shadow-neon transition-all duration-1000 whitespace-nowrap"
                    style={{ width: `${progress}%` }}
                />

                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Ganhos em Tempo Real</p>
                        <div className="flex items-baseline gap-1">
                            <span className={`text-4xl font-black text-white tabular-nums tracking-tighter ${isPlaying ? 'animate-pulse text-green-400' : ''}`}>
                                {currentEarnings}
                            </span>
                            <span className="text-sm font-bold text-muted-foreground uppercase italic">Kz</span>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Tempo de Antena</p>
                        <div className="flex items-center justify-end gap-2">
                            <span className="text-xl font-mono font-bold text-white whitespace-nowrap">
                                {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                            </span>
                            <Clock className={`w-4 h-4 ${isPlaying ? 'text-primary animate-spin' : 'text-muted-foreground'}`} style={{ animationDuration: '3s' }} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a
                    href={campaign.page_link?.includes('?') ? `${campaign.page_link}&sub_confirmation=1` : `${campaign.page_link}?sub_confirmation=1`}
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
