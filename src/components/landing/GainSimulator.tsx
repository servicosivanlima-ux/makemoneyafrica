import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const GainSimulator = () => {
    const [tasksPerDay, setTasksPerDay] = useState(20);
    const avgReward = 150; // Average reward in Kz per task (some are 50, some 300)

    const dailyGain = tasksPerDay * avgReward;
    const monthlyGain = dailyGain * 30;

    const formatKz = (value: number) => {
        return new Intl.NumberFormat("pt-AO", {
            style: "decimal",
            minimumFractionDigits: 0
        }).format(value) + " Kz";
    };

    return (
        <section id="simulador" className="section-container relative">
            <div className="absolute inset-0 bg-primary/5 mask-radial pointer-events-none" />

            <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
                <div>
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-primary text-xs font-black uppercase tracking-widest mb-4"
                    >
                        Simulador de Ganhos
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground mb-8 leading-tight"
                    >
                        Quanto você pode <span className="text-gradient-neon">Ganhar?</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-muted-foreground text-lg mb-10 leading-relaxed"
                    >
                        Não é mágica, é trabalho real. Simule seus ganhos diários baseados no número de tarefas que você completa nas suas horas vagas.
                    </motion.p>

                    <div className="space-y-6 max-w-md">
                        <div className="flex items-center gap-4 p-4 rounded-2xl glass-card border-white/5">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-primary" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                <span className="text-foreground font-bold">Dica:</span> Quanto mais divulgares o site, mais probabilidade de tarefas terá disponíveis.
                            </p>
                        </div>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    className="card-premium-glow p-8 md:p-12 relative overflow-hidden"
                >
                    {/* Decorative Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[80px] rounded-full" />

                    <div className="relative z-10 space-y-10">
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <label className="text-sm uppercase tracking-widest font-black text-muted-foreground">Tarefas por dia</label>
                                <span className="text-4xl font-black text-primary">{tasksPerDay}</span>
                            </div>
                            <input
                                type="range"
                                min="5"
                                max="100"
                                step="5"
                                value={tasksPerDay}
                                onChange={(e) => setTasksPerDay(parseInt(e.target.value))}
                                className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                            />
                            <div className="flex justify-between mt-3 text-[10px] uppercase font-bold text-muted-foreground">
                                <span>5 tarefas</span>
                                <span>100 tarefas</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 block">
                                <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Ganhos Diários</div>
                                <div className="text-xl font-black text-foreground">{formatKz(dailyGain)}</div>
                            </div>
                            <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 block">
                                <div className="text-[10px] uppercase tracking-widest font-bold text-primary mb-2">Ganhos Mensais</div>
                                <div className="text-2xl font-black text-primary">{formatKz(monthlyGain)}</div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/5">
                            <Link to="/auth?type=worker" className="btn-premium w-full h-16 flex items-center justify-center gap-3">
                                <TrendingUp className="w-6 h-6" />
                                Começar a Ganhar Agora
                            </Link>
                            <p className="text-center text-[10px] text-muted-foreground mt-4 uppercase tracking-[0.2em]">
                                Pagamentos via IBAN ou Multicaixa Express
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default GainSimulator;
