import { ShieldAlert, Globe, Lock } from "lucide-react";
import { motion } from "framer-motion";

interface RestrictedProps {
    reason: "region" | "vpn";
}

const Restricted = ({ reason }: RestrictedProps) => {
    return (
        <div className="min-h-screen bg-background bg-mesh-gradient flex items-center justify-center p-6">
            <div className="max-w-md w-full">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-8 border-destructive/20 text-center relative overflow-hidden"
                >
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-destructive/10 blur-[80px] rounded-full pointer-events-none" />

                    <div className="relative z-10">
                        <div className="w-20 h-20 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-destructive/5">
                            {reason === "vpn" ? (
                                <Lock className="w-10 h-10 text-destructive" />
                            ) : (
                                <Globe className="w-10 h-10 text-destructive" />
                            )}
                        </div>

                        <h1 className="text-3xl font-black text-foreground mb-4 uppercase tracking-tight">
                            Acesso <span className="text-destructive">Negado</span>
                        </h1>

                        <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                            {reason === "vpn"
                                ? "Detectamos o uso de VPN ou Proxy. Por motivos de segurança e conformidade, o acesso anonimizado não é permitido nesta plataforma."
                                : "Desculpe, mas a Make Money With Lima ainda não está disponível na sua região. Estamos expandindo gradualmente."}
                        </p>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-left mb-8">
                            <div className="flex items-center gap-3 mb-2">
                                <ShieldAlert className="w-4 h-4 text-destructive" />
                                <span className="text-xs font-bold text-foreground uppercase tracking-widest">
                                    Regiões Permitidas
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {["Angola", "Moçambique", "Brasil", "Portugal"].map((country) => (
                                    <span
                                        key={country}
                                        className="px-2 py-1 rounded-md bg-white/5 text-[10px] text-muted-foreground font-medium uppercase"
                                    >
                                        {country}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="text-xs text-muted-foreground/50 uppercase tracking-[0.2em]">
                            ID de Referência: {Math.random().toString(36).substring(7).toUpperCase()}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Restricted;
