import React from 'react';
import { motion } from 'framer-motion';
import { Video, Star, Users, CheckCircle, ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

const BusinessPromotion = () => {
    const benefits = [
        {
            icon: Star,
            title: "Credibilidade Instantânea",
            description: "Vídeos de pessoas reais geram 10x mais confiança do que anúncios comuns."
        },
        {
            icon: Users,
            title: "Alcance Orgânico",
            description: "Conteúdo autêntico é mais partilhado e favorecido pelos algoritmos das redes sociais."
        },
        {
            icon: Play,
            title: "Engajamento Real",
            description: "Pessoas param para ouvir pessoas. Aumente as suas conversões com depoimentos reais."
        }
    ];

    return (
        <section className="section-container relative overflow-hidden bg-card/30">
            <div className="container-app relative z-10 py-24">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Visual Side */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="relative"
                    >
                        <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-3xl -z-10 animate-pulse-slow" />
                        <div className="card-premium-glow p-2 rounded-[3rem] overflow-hidden group">
                            <div className="relative aspect-[9/16] max-w-[320px] mx-auto bg-black rounded-[2.5rem] overflow-hidden border-8 border-white/5">
                                {/* Mock Phone Video */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-black">
                                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center animate-bounce shadow-neon">
                                        <Video className="w-8 h-8 text-black" />
                                    </div>
                                    <p className="mt-4 text-xs font-black text-primary uppercase tracking-widest text-center px-6">
                                        O Teu Negócio Promovido por Pessoas Reais
                                    </p>
                                </div>

                                {/* Overlay Elements */}
                                <div className="absolute bottom-10 left-6 right-6 space-y-3">
                                    <div className="h-2 w-2/3 bg-white/20 rounded-full" />
                                    <div className="h-2 w-full bg-white/10 rounded-full" />
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-white/30" />
                                        <div className="space-y-1 flex-1">
                                            <div className="h-2 w-1/2 bg-white/20 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Stats */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.4 }}
                            className="absolute -right-8 top-1/4 glass-card p-6 rounded-2xl border-primary/30 shadow-neon hidden md:block"
                        >
                            <p className="text-3xl font-black text-primary tracking-tighter">+85%</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Taxa de Conversão</p>
                        </motion.div>
                    </motion.div>

                    {/* Content Side */}
                    <div className="space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            <span className="inline-block px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest mb-4">
                                Exclusivo para Empresas
                            </span>
                            <h2 className="text-5xl md:text-6xl font-black text-foreground mb-6 leading-tight">
                                Dê uma Voz Real ao seu <span className="text-gradient-neon">Produto</span>
                            </h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                Chega de anúncios genéricos que ninguém vê. Use a força da nossa comunidade em Angola para criar depoimentos, unboxings e tutoriais autênticos que vendem.
                            </p>
                        </motion.div>

                        <div className="space-y-6">
                            {benefits.map((benefit, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary shadow-inner transition-all">
                                        <benefit.icon className="w-5 h-5 text-primary group-hover:text-black" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-foreground mb-1">{benefit.title}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5 }}
                            className="pt-4"
                        >
                            <Link to="/auth?type=client" className="btn-primary px-8 py-4 rounded-xl flex items-center justify-center gap-3 w-full sm:w-auto group">
                                <span className="font-black uppercase tracking-widest text-sm">Criar Minha Campanha de Vídeo</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default BusinessPromotion;
