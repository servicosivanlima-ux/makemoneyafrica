import { Shield, TrendingUp, Users, ArrowRight, CheckCircle2, Banknote, Coins, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background bg-mesh-gradient">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[140px] animate-pulse-slow active:opacity-70" />
        <div className="absolute bottom-1/2 right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none mask-radial" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, hsl(84, 100%, 59%) 1px, transparent 0)`,
        backgroundSize: '48px 48px'
      }} />

      <div className="container-app relative z-10 pt-32 pb-20">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-3 px-5 py-2 rounded-full glass-card-lime mb-10 border border-primary/20 shadow-neon"
          >
            <img src="/angola-flag.png" alt="AO" className="w-5 h-5 object-contain rounded-full shadow-lg" />
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 text-red-500 font-black text-xs shadow-[0_0_15px_rgba(239,68,68,0.2)]">18+</span>
              <span className="text-xs font-black text-primary uppercase tracking-[0.3em]">Plataforma Nº1 em Angola</span>
            </div>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-10 leading-[1.1] tracking-tighter"
          >
            <span className="text-foreground block">Faça Dinheiro</span>
            <span className="flex items-center justify-center gap-3 sm:gap-4">
              <span className="text-muted-foreground/30 text-3xl sm:text-4xl md:text-5xl font-medium tracking-normal lowercase">com</span>
              <span className="text-gradient-neon filter drop-shadow-[0_0_40px_rgba(132,255,46,0.4)] uppercase">LIMA</span>
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg sm:text-xl md:text-2xl text-muted-foreground/90 max-w-3xl mx-auto mb-12 leading-relaxed font-medium"
          >
            A nova era do marketing digital em Angola. Potencialize seu perfil ou transforme seu tempo livre em renda real com pagamentos comprovados em <span className="text-primary font-black">Kwanza (AOA)</span>.
          </motion.p>

          {/* CTA Group */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20"
          >
            <Link to="/auth?type=client" className="btn-premium w-full sm:w-auto h-16 flex items-center justify-center gap-3">
              <TrendingUp className="w-6 h-6" />
              Criar Minha Campanha
            </Link>
            <Link to="/auth?type=worker" className="btn-outline-premium w-full sm:w-auto h-16 flex items-center justify-center gap-3 group">
              <Users className="w-6 h-6 transition-colors group-hover:text-primary" />
              Trabalhar e Ganhar
            </Link>
          </motion.div>

          {/* Trust Banner */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto border-t border-white/5 pt-12"
          >
            {[
              { icon: Shield, title: "100% Seguro", text: "Pagamentos verificados" },
              { icon: CheckCircle2, title: "Focado em Angola", text: "Moeda local Kwanza" },
              { icon: ArrowRight, title: "Saque na hora ou até 24h", text: "Número Express ou Transferência/IBAN" }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 text-left p-4 rounded-2xl glass-card border-white/5 hover:border-primary/20 transition-all duration-300">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Floating Elements (Decorative) */}
      <div className="absolute top-1/4 left-10 w-24 h-24 bg-primary/20 rounded-full blur-3xl animate-float opacity-30" />
      <div className="absolute bottom-1/4 right-10 w-32 h-32 bg-gold/10 rounded-full blur-3xl animate-float opacity-30" style={{ animationDelay: '2s' }} />

      {/* Money Theme Floating Icons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[15%] left-[5%] text-primary/20"
        >
          <Banknote size={48} className="blur-[1px]" />
        </motion.div>

        <motion.div
          animate={{ y: [0, 20, 0], rotate: [0, -15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[25%] right-[8%] text-yellow-500/20"
        >
          <Coins size={40} className="blur-[1px]" />
        </motion.div>

        <motion.div
          animate={{ y: [0, -15, 0], x: [0, 10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[20%] left-[12%] text-primary/15"
        >
          <DollarSign size={32} />
        </motion.div>

        <div className="absolute top-[40%] right-[15%] text-primary/10 font-black text-6xl select-none rotate-12 blur-[2px]">
          Kz
        </div>
      </div>
    </section>
  );
};

export default Hero;
