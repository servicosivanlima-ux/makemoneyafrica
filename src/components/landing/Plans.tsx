import { Check, Star, Zap, Clock, ShieldCheck, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Plans = () => {
  const limaoPlans = [
    { name: "Básico", followers: 30, price: "6.000 Kz", time: "1 Semana", priority: "Normal" },
    { name: "Super Básico", followers: 50, price: "8.000 Kz", time: "1 Semana", priority: "Normal" },
    { name: "Tá Fixe", followers: 100, price: "15.000 Kz", time: "1 Semana", priority: "Alta", popular: true },
    { name: "Bronze", followers: 200, price: "27.000 Kz", time: "1 Semana", priority: "Alta" },
    { name: "Prata", followers: 500, price: "75.000 Kz", time: "2 Semanas", priority: "VIP" },
    { name: "Ouro", followers: 1000, price: "125.000 Kz", time: "3 Semanas", priority: "VIP" },
    { name: "Premium", followers: 3500, price: "400.000 Kz", time: "4 Semanas", priority: "Sócio", premium: true },
  ];

  const kwanzaPlans = [
    { name: "Básico", actions: 50, price: "30.000 Kz", time: "1 Semana", priority: "Normal" },
    { name: "Super Básico", actions: 100, price: "50.000 Kz", time: "1 Semana", priority: "Normal" },
    { name: "Tá Fixe", actions: 150, price: "70.000 Kz", time: "1 Semana", priority: "Alta", popular: true },
    { name: "Bronze", actions: 200, price: "100.000 Kz", time: "1 Semana", priority: "Alta" },
    { name: "Prata", actions: 500, price: "250.000 Kz", time: "2 Semanas", priority: "VIP" },
    { name: "Ouro", actions: 1000, price: "400.000 Kz", time: "3 Semanas", priority: "VIP" },
    { name: "Premium", actions: 2500, price: "850.000 Kz", time: "4 Semanas", priority: "Sócio", premium: true },
  ];

  return (
    <section id="planos" className="section-container relative">
      <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest mb-4"
          >
            Investimento & Retorno
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl sm:text-6xl md:text-7xl font-black text-foreground mb-6 tracking-tighter"
          >
            Impulsione a sua Presença <span className="text-gradient-neon animate-pulse-slow">Digital</span>
          </motion.h2>
          <div className="flex flex-col items-center gap-4 text-muted-foreground text-lg">
            <p className="flex items-center gap-2">
              Moeda Oficial: <span className="text-foreground font-black">Kwanza (AOA)</span>
              <img src="/angola-flag.png" alt="AO" className="w-5 h-5 object-contain rounded-full shadow-lg" />
            </p>
            <p className="text-sm px-6 py-2 glass-card rounded-full border-white/5">
              🚀 Pagamentos automáticos via Multicaixa Express
            </p>
          </div>
        </div>

        {/* Plan Section 1 */}
        <div className="mb-24">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-3xl font-black text-foreground uppercase tracking-tighter">Plano "Tá no Limão"</h3>
              <p className="text-xs text-primary font-black uppercase tracking-[0.2em] mt-1">Seguidores Reais & Orgânicos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {limaoPlans.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`group p-8 rounded-3xl border transition-all duration-500 hover:scale-105 ${plan.premium
                  ? "glass-card-gold border-gold/40 shadow-gold-premium"
                  : plan.popular
                    ? "glass-card-lime border-primary/40 shadow-neon"
                    : "glass-card border-white/5 hover:border-white/20"
                  }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <h4 className={`text-2xl font-black tracking-tighter ${plan.premium ? 'text-yellow-500' : 'text-foreground'}`}>{plan.name}</h4>
                  {plan.popular && <span className="px-3 py-1 bg-primary text-black text-[10px] font-black rounded-full uppercase tracking-tighter shadow-neon">Popular</span>}
                  {plan.premium && <Trophy className="w-6 h-6 text-yellow-500" />}
                </div>

                <div className="mb-6">
                  <div className={`text-5xl font-black tracking-tighter ${plan.premium ? 'text-yellow-500' : 'text-primary'}`}>
                    {plan.followers.toLocaleString()}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mt-1">Seguidores</div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-4 h-4 text-primary/60" />
                    Entrega: <b>{plan.time}</b>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-primary/60" />
                    Prioridade: <b>{plan.priority}</b>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-3xl font-black text-foreground tracking-tighter">{plan.price}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-black">AOA</span>
                </div>

                <Link
                  to="/auth?type=client"
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 flex items-center justify-center ${plan.premium
                    ? "bg-yellow-500 text-yellow-950 hover:bg-yellow-400"
                    : plan.popular
                      ? "bg-primary text-black hover:bg-primary/80"
                      : "bg-white/5 text-white hover:bg-white/10"
                    }`}
                >
                  Selecionar
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Plan Section 2 */}
        <div>
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-3xl font-black text-foreground uppercase tracking-tighter">Plano "Kwanza"</h3>
              <p className="text-xs text-yellow-500 font-black uppercase tracking-[0.2em] mt-1">Engajamento Elite (Seguir + Curtir + Comentar + Partilhar)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kwanzaPlans.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`group p-8 rounded-3xl border transition-all duration-500 hover:scale-105 ${plan.premium
                  ? "glass-card-gold border-gold/40 shadow-gold-premium"
                  : plan.popular
                    ? "glass-card-gold border-white/20"
                    : "glass-card border-white/5 hover:border-white/20"
                  }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <h4 className={`text-2xl font-black tracking-tighter ${plan.premium ? 'text-yellow-500' : 'text-foreground'}`}>{plan.name}</h4>
                  {plan.popular && <span className="px-3 py-1 bg-yellow-500 text-black text-[10px] font-black rounded-full uppercase tracking-tighter shadow-gold-premium">Elite</span>}
                </div>

                <div className="mb-6">
                  <div className={`text-5xl font-black tracking-tighter ${plan.premium ? 'text-yellow-500' : 'text-yellow-500'}`}>
                    {plan.actions.toLocaleString()}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mt-1">Acções Reais</div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-4 h-4 text-yellow-500/60" />
                    Entrega: <b>{plan.time}</b>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-yellow-500/60" />
                    Prioridade: <b>{plan.priority}</b>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-2xl font-black text-foreground">{plan.price}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">AOA</span>
                </div>

                <Link
                  to="/auth?type=client"
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 flex items-center justify-center ${plan.premium
                    ? "bg-yellow-500 text-yellow-950 hover:bg-yellow-400"
                    : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                >
                  Selecionar
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Plans;
