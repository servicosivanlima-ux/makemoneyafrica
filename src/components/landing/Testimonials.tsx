import { motion } from "framer-motion";
import { Star, Quote, CheckCircle2 } from "lucide-react";

const testimonials = [
    {
        name: "Mauro Silva",
        location: "Luanda",
        role: "Trabalhador Freelance",
        content: "No início estava cético, mas o Lima mudou a minha rotina. Já fiz 3 levantamentos e o melhor é poder sacar logo que chego aos 500 Kz. Cai na conta super rápido!",
        rating: 5,
    },
    {
        name: "Ana Paula",
        location: "Benguela",
        role: "Estudante",
        content: "Consigo pagar os meus pequenos gastos apenas fazendo tarefas nas horas livres. O sistema de 500 Kz facilitou tudo, não preciso de esperar semanas para receber.",
        rating: 5,
    },
    {
        name: "João Carlos",
        location: "Huambo",
        role: "Micro-Influenciador",
        content: "Excelente plataforma para quem quer rendimento extra em Angola. O suporte é atencioso e o pagamento via Multicaixa Express é instantâneo após a aprovação.",
        rating: 5,
    }
];

const Testimonials = () => {
    return (
        <section className="section-container relative bg-white/[0.02]">
            <div className="container-app relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-block px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest mb-4"
                    >
                        Depoimentos Reais
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl sm:text-5xl font-black text-foreground mb-6 leading-tight"
                    >
                        Quem já utiliza, <span className="text-gradient-neon">Recomenda</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-muted-foreground text-lg"
                    >
                        Milhares de angolanos já estão a monetizar o seu tempo livre com total segurança e transparência.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((t, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="card-premium-glow p-8 flex flex-col h-full relative group"
                        >
                            <Quote className="absolute top-6 right-8 w-10 h-10 text-primary/10 group-hover:text-primary/20 transition-colors" />

                            <div className="flex gap-1 mb-6">
                                {[...Array(t.rating)].map((_, idx) => (
                                    <Star key={idx} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                ))}
                            </div>

                            <p className="text-foreground/90 italic mb-8 flex-grow leading-relaxed">
                                "{t.content}"
                            </p>

                            <div className="flex items-center gap-4 border-t border-white/5 pt-6">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center border border-white/10">
                                    <span className="text-primary font-bold">{t.name.charAt(0)}</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="font-bold text-foreground">{t.name}</h4>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">{t.location} • {t.role}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Bottom Proof Info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="mt-16 text-center"
                >
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10">
                        <div className="flex -space-x-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted" />
                            ))}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Junte-se a mais de <span className="text-foreground font-bold">+5.000 usuários</span> ativos em todo o país.
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default Testimonials;
