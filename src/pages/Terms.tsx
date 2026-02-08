import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Shield, Scale, CreditCard, AlertTriangle, Mail, Globe } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const Terms = () => {
    useEffect(() => {
        const hash = window.location.hash;
        if (hash) {
            const element = document.querySelector(hash);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        }
    }, []);

    return (
        <div className="min-h-screen bg-background bg-mesh-gradient">
            <Navbar />

            <main className="section-container relative z-10 pt-32">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-12 group">
                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-primary/40 group-hover:bg-primary/10 transition-all">
                                <ChevronLeft className="w-4 h-4 group-hover:text-primary" />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-widest">Voltar para o Início</span>
                        </Link>
                    </motion.div>

                    <motion.header
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-16"
                    >
                        <h1 className="text-5xl sm:text-6xl font-black text-foreground mb-6 leading-tight">
                            Termos de <span className="text-gradient-neon">Uso</span> & <span className="text-gradient-gold-flare">Privacidade</span>
                        </h1>
                        <p className="text-muted-foreground text-lg border-l-2 border-primary/40 pl-4 uppercase tracking-[0.2em] font-bold mb-10">
                            Última atualização: 7 de Fevereiro de 2026
                        </p>

                        {/* Quick Navigation */}
                        <div className="flex flex-wrap gap-3 p-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                            {[
                                { id: "aceitacao", label: "Termos" },
                                { id: "contas", label: "Contas" },
                                { id: "pagamentos", label: "Pagamentos" },
                                { id: "fraude", label: "Segurança" },
                                { id: "privacidade", label: "Privacidade" },
                                { id: "cookies", label: "Cookies" }
                            ].map(item => (
                                <a
                                    key={item.id}
                                    href={`#${item.id}`}
                                    className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                                >
                                    {item.label}
                                </a>
                            ))}
                        </div>
                    </motion.header>

                    <div className="space-y-10">
                        {/* Section 1 */}
                        <motion.section
                            id="aceitacao"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="glass-card p-10 border-white/5 scroll-mt-32"
                        >
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <Scale className="w-6 h-6 text-primary" />
                                </div>
                                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">1. Aceitação dos Termos</h2>
                            </div>
                            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                                Ao acessar e utilizar o site <strong>Make Money With Lima</strong>, você concorda em cumprir e estar vinculado a estes Termos de Uso. Esta plataforma está aberta para utilizadores residentes em:
                            </p>
                            <div className="flex flex-wrap gap-4">
                                {[
                                    { name: 'Angola', flag: '/angola-flag.png' },
                                    { name: 'Moçambique', flag: 'https://flagcdn.com/w80/mz.png' },
                                    { name: 'Brasil', flag: 'https://flagcdn.com/w80/br.png' },
                                    { name: 'Portugal', flag: 'https://flagcdn.com/w80/pt.png' }
                                ].map(country => (
                                    <div key={country.name} className="flex items-center gap-3 px-5 py-2 rounded-xl bg-white/5 border border-white/10 group hover:border-primary/30 transition-all duration-300">
                                        <div className="w-6 h-6 rounded-full overflow-hidden shadow-lg border border-white/10 group-hover:scale-110 transition-transform">
                                            <img src={country.flag} alt={country.name} className="w-full h-full object-cover" />
                                        </div>
                                        <span className="text-sm font-black uppercase tracking-widest text-foreground">{country.name}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.section>

                        {/* Section 2 */}
                        <motion.section
                            id="contas"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="glass-card p-10 border-white/5 scroll-mt-32"
                        >
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                    <Shield className="w-6 h-6 text-blue-500" />
                                </div>
                                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">2. Responsabilidade da Conta</h2>
                            </div>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                Você é responsável por manter a confidencialidade de sua conta e senha. Qualquer atividade realizada através da sua conta será de sua inteira responsabilidade. É proibido o uso de contas falsas, bots ou qualquer ferramenta automatizada para interagir com o sistema.
                            </p>
                        </motion.section>

                        {/* Section 3 */}
                        <motion.section
                            id="pagamentos"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="glass-card p-10 border-white/5 scroll-mt-32"
                        >
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                    <CreditCard className="w-6 h-6 text-green-500" />
                                </div>
                                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">3. Pagamentos e Reembolsos</h2>
                            </div>
                            <div className="space-y-6 text-muted-foreground text-lg leading-relaxed">
                                <p className="flex gap-3">
                                    <span className="text-primary font-black">•</span>
                                    <span>A moeda oficial e base da plataforma é o <strong className="text-foreground">Kwanza (AOA)</strong>. Todos os valores apresentados e pagos seguem esta moeda.</span>
                                </p>
                                <p className="flex gap-3">
                                    <span className="text-primary font-black">•</span>
                                    <span>Clientes devem enviar comprovativos válidos de transferência ou Multicaixa Express via WhatsApp para ativação de campanhas.</span>
                                </p>
                                <p className="flex gap-3">
                                    <span className="text-primary font-black">•</span>
                                    <span>Trabalhadores podem solicitar saques via IBAN ou Multicaixa Express. No caso de utilizadores internacionais, devem contactar o suporte.</span>
                                </p>
                            </div>
                        </motion.section>

                        {/* Section 4 */}
                        <motion.section
                            id="fraude"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="glass-card p-10 border-destructive/20 bg-destructive/5 relative overflow-hidden scroll-mt-32"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/10 blur-[60px] rounded-full" />
                            <div className="flex items-center gap-4 mb-8 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-destructive/20 flex items-center justify-center border border-destructive/30">
                                    <AlertTriangle className="w-6 h-6 text-destructive" />
                                </div>
                                <h2 className="text-2xl font-black text-destructive uppercase tracking-tight">4. Tolerância Zero para Fraude</h2>
                            </div>
                            <div className="space-y-6 text-muted-foreground text-lg leading-relaxed relative z-10">
                                <p>
                                    A segurança de nossos clientes é prioridade. Qualquer tentativa de fraude resultará em <strong className="text-destructive uppercase">banimento imediato e irreversível</strong>, incluindo:
                                </p>
                                <ul className="grid sm:grid-cols-2 gap-4">
                                    {[
                                        "Comprovativos falsos",
                                        "Prints de terceiros",
                                        "Contas fantasmas",
                                        "Exploração de bugs"
                                    ].map(item => (
                                        <li key={item} className="flex items-center gap-2 text-sm font-bold text-destructive/80">
                                            <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </motion.section>

                        {/* Section 5 - Privacy */}
                        <motion.section
                            id="privacidade"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="glass-card p-10 border-white/5 scroll-mt-32"
                        >
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <Shield className="w-6 h-6 text-primary" />
                                </div>
                                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">5. Privacidade de Dados</h2>
                            </div>
                            <div className="space-y-6 text-muted-foreground text-lg leading-relaxed">
                                <p>
                                    Coletamos apenas as informações necessárias para operar a plataforma e processar seus pagamentos com segurança. Seus dados de redes sociais são usados exclusivamente para validar as tarefas realizadas.
                                </p>
                                <ul className="space-y-3">
                                    <li className="flex gap-3 text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                                        <span><strong>Transparência:</strong> Nunca compartilhamos seus contatos de WhatsApp ou Email com terceiros.</span>
                                    </li>
                                    <li className="flex gap-3 text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                                        <span><strong>Segurança:</strong> Todos os comprovativos de pagamento são armazenados em ambiente criptografado.</span>
                                    </li>
                                </ul>
                            </div>
                        </motion.section>

                        {/* Section 6 - Cookies */}
                        <motion.section
                            id="cookies"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="glass-card p-10 border-white/5 scroll-mt-32"
                        >
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                    <Globe className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">6. Cookies e Rastreamento</h2>
                            </div>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                Utilizamos cookies essenciais para manter sua sessão ativa e garantir que você não precise fazer login repetidamente. Cookies de terceiros podem ser usados de forma anônima para melhorar a performance do site em Angola e em outros países lusófonos.
                            </p>
                        </motion.section>

                        {/* Section 7 - Support */}
                        <motion.section
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="card-premium-glow p-10 text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-8">
                                <Mail className="w-8 h-8 text-accent" />
                            </div>
                            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight mb-6">Ainda tem dúvidas?</h2>
                            <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">
                                Se tiver dúvidas sobre estes termos ou precisar de suporte, nosso canal oficial no WhatsApp está disponível para ajudar.
                            </p>
                            <a
                                href="https://wa.me/244923066682"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-premium py-4 px-12 inline-flex items-center gap-3"
                            >
                                Contactar Suporte
                            </a>
                        </motion.section>
                    </div>

                    <div className="mt-24 text-center border-t border-white/5 pt-12 text-sm text-muted-foreground uppercase tracking-[0.4em] font-black opacity-30">
                        Make Money With Lima - 2026
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Terms;
