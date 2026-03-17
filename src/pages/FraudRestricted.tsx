import { ShieldAlert, AlertOctagon, MessageCircle, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const FraudRestricted = () => {
    return (
        <div className="min-h-screen bg-background bg-mesh-gradient flex items-center justify-center p-6">
            <div className="max-w-2xl w-full">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-10 border-destructive/30 text-center relative overflow-hidden"
                >
                    {/* Background Warning Glow */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-destructive/10 blur-[100px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-900/10 blur-[100px] rounded-full pointer-events-none" />

                    <div className="relative z-10">
                        <motion.div
                            initial={{ y: -20 }}
                            animate={{ y: 0 }}
                            className="w-24 h-24 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-destructive/20"
                        >
                            <AlertOctagon className="w-12 h-12 text-destructive animate-pulse" />
                        </motion.div>

                        <h1 className="text-4xl sm:text-5xl font-black text-foreground mb-4 uppercase tracking-tighter">
                            Conta <span className="text-destructive">Restrita</span>
                        </h1>

                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 mb-8">
                            <ShieldAlert className="w-4 h-4 text-destructive" />
                            <span className="text-xs font-black text-destructive uppercase tracking-widest">
                                Violação dos Termos de Serviço
                            </span>
                        </div>

                        <p className="text-muted-foreground text-lg mb-4 leading-relaxed max-w-xl mx-auto font-medium">
                            O nosso sistema de segurança automático detectou o <strong>uso de dados duplicados</strong> associados à sua conta (Documento de Identidade ou IBAN/Número Express já registado por outro utilizador).
                        </p>

                        <div className="p-6 rounded-2xl bg-destructive/5 border border-destructive/10 text-center mb-8 max-w-lg mx-auto">
                            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-3" />
                            <h3 className="text-white font-bold text-lg mb-2">Ação Obrigatória</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                                Tem exactamente 24 horas para justificar esta ocorrência com a nossa equipa de suporte técnico. Caso o tempo expire sem contacto, a sua conta será <strong className="text-destructive">permanentemente eliminada</strong> e os fundos cancelados.
                            </p>

                            <a
                                href="https://wa.me/244923066682"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-3 px-8 py-4 w-full sm:w-auto rounded-xl bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest text-sm transition-all shadow-lg hover:shadow-green-500/25 hover:-translate-y-1"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Contactar Suporte via WhatsApp
                            </a>
                        </div>

                        <p className="text-xs text-muted-foreground/50 uppercase tracking-[0.2em]">
                            Número do Suporte: +244 923 066 682
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default FraudRestricted;
