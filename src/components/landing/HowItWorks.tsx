import { Briefcase, CheckCircle, CreditCard, FileText, Target, Upload, Users, Wallet, Zap } from "lucide-react";
import { motion } from "framer-motion";

const HowItWorks = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5 }
    }
  };

  const clientSteps = [
    {
      icon: FileText,
      title: "1. Escolha a Missão",
      description: "Selecione entre seguidores, engajamento ou vídeos promocionais de pessoas reais.",
    },
    {
      icon: Target,
      title: "2. Defina o Guião",
      description: "Diga o que as pessoas devem dizer ou fazer no vídeo para promover o seu negócio.",
    },
    {
      icon: CreditCard,
      title: "3. Confirme o Pagamento",
      description: "Processo manual e seguro via transferência ou Multicaixa Express.",
    },
    {
      icon: CheckCircle,
      title: "4. Resultado Garantido",
      description: "Acompanhe o crescimento real e orgânico das suas redes.",
    },
  ];

  const workerSteps = [
    {
      icon: Users,
      title: "1. Criar Perfil",
      description: "Registe as suas redes sociais e seja verificado pela nossa equipa.",
    },
    {
      icon: Zap,
      title: "2. Executar Tarefas",
      description: "Curta, siga ou comente em perfis reais de clientes.",
    },
    {
      icon: Upload,
      title: "3. Enviar Provas",
      description: "Faça upload das capturas de ecrã e receba aprovação rápida.",
    },
    {
      icon: Wallet,
      title: "4. Sacar Ganhos",
      description: "Retire o seu dinheiro acumulado com um saque mínimo de apenas 500 Kz, diretamente para a sua conta.",
    },
  ];

  return (
    <section className="section-container relative overflow-hidden">
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

      <div className="relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1 rounded-full bg-card/60 border border-border text-primary text-xs font-black uppercase tracking-widest mb-4"
          >
            Fluxo de Trabalho
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black text-foreground mb-6"
          >
            Simples, Rápido e <span className="text-gradient-neon">Transparente</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg sm:text-xl"
          >
            Construímos a ponte entre quem precisa de impacto digital e quem quer monetizar a sua influência.
          </motion.p>
        </div>

        {/* Two columns */}
        <div className="grid lg:grid-cols-2 gap-10">
          {/* For Clients */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="card-premium-glow p-8 lg:p-12"
          >
            <div className="flex items-center gap-4 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-neon">
                <Briefcase className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">Para Clientes</h3>
                <p className="text-sm text-primary font-medium tracking-wide uppercase">Crescimento Acelerado</p>
              </div>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-8"
            >
              {clientSteps.map((step, i) => (
                <motion.div key={i} variants={itemVariants} className="flex gap-5 group">
                  <div className="w-12 h-12 rounded-xl bg-card/60 border border-border flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all duration-300">
                    <step.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="pt-1">
                    <h4 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{step.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* For Workers */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="card-premium-glow p-8 lg:p-12"
          >
            <div className="flex items-center gap-4 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-yellow-500 flex items-center justify-center shadow-gold-premium">
                <Wallet className="w-7 h-7 text-yellow-950" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">Para Trabalhadores</h3>
                <p className="text-sm text-yellow-500 font-medium tracking-wide uppercase">Monetize seu Tempo</p>
              </div>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-8"
            >
              {workerSteps.map((step, i) => (
                <motion.div key={i} variants={itemVariants} className="flex gap-5 group">
                  <div className="w-12 h-12 rounded-xl bg-card/60 border border-border flex items-center justify-center shrink-0 group-hover:bg-yellow-500/10 group-hover:border-yellow-500/30 transition-all duration-300">
                    <step.icon className="w-5 h-5 text-muted-foreground group-hover:text-yellow-500 transition-colors" />
                  </div>
                  <div className="pt-1">
                    <h4 className="text-lg font-bold text-foreground mb-1 group-hover:text-yellow-500 transition-colors">{step.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
