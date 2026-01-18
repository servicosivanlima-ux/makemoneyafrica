import { Check, Star, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Plans = () => {
  const limaoPlans = [
    { name: "Básico", followers: 30, price: "6.000 Kz" },
    { name: "Super Básico", followers: 50, price: "8.000 Kz" },
    { name: "Tá Fixe", followers: 100, price: "15.000 Kz", popular: true },
    { name: "Bronze", followers: 200, price: "27.000 Kz" },
    { name: "Prata", followers: 500, price: "75.000 Kz" },
    { name: "Ouro", followers: 1000, price: "125.000 Kz" },
    { name: "Premium", followers: 3500, price: "400.000 Kz", premium: true },
  ];

  const kwanzaPlans = [
    { name: "Básico", actions: 50, price: "30.000 Kz" },
    { name: "Super Básico", actions: 100, price: "50.000 Kz" },
    { name: "Tá Fixe", actions: 150, price: "70.000 Kz", popular: true },
    { name: "Bronze", actions: 200, price: "100.000 Kz" },
    { name: "Prata", actions: 500, price: "250.000 Kz" },
    { name: "Ouro", actions: 1000, price: "400.000 Kz" },
    { name: "Premium", actions: 2500, price: "850.000 Kz", premium: true },
  ];

  return (
    <section id="planos" className="section-padding bg-gradient-dark relative">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="container-app">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Planos & Preços
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Escolha o Plano <span className="text-gradient-lime">Ideal</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Temos opções para todos os tamanhos de campanha. Quanto maior o plano, melhor o custo-benefício.
          </p>
        </div>

        {/* Plan Type 1: Tá no Limão */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-gradient-lime flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold text-foreground">Plano "Tá no Limão"</h3>
              <p className="text-sm text-muted-foreground">Foco em seguidores reais</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {limaoPlans.map((plan, i) => (
              <div
                key={i}
                className={`relative p-6 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
                  plan.premium
                    ? "bg-gradient-gold border-gold/50 shadow-[0_0_40px_hsl(45_93%_58%/0.2)]"
                    : plan.popular
                    ? "bg-gradient-card border-primary/50 shadow-glow"
                    : "bg-card border-border hover:border-primary/30"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    Popular
                  </div>
                )}
                {plan.premium && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gold text-xs font-semibold text-gold-foreground flex items-center gap-1">
                    <Star className="w-3 h-3" /> Premium
                  </div>
                )}
                <h4 className={`font-display font-bold text-lg mb-2 ${plan.premium ? "text-gold-foreground" : "text-foreground"}`}>
                  {plan.name}
                </h4>
                <div className={`text-3xl font-bold mb-1 ${plan.premium ? "text-gold-foreground" : "text-gradient-lime"}`}>
                  {plan.followers.toLocaleString()}
                </div>
                <p className={`text-sm mb-4 ${plan.premium ? "text-gold-foreground/70" : "text-muted-foreground"}`}>
                  seguidores
                </p>
                <div className={`text-xl font-semibold ${plan.premium ? "text-gold-foreground" : "text-foreground"}`}>
                  {plan.price}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Type 2: Kwanza */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
              <Star className="w-5 h-5 text-gold-foreground" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold text-foreground">Plano "Kwanza"</h3>
              <p className="text-sm text-muted-foreground">Engajamento completo: Seguir + Curtir + Comentar + Partilhar</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {kwanzaPlans.map((plan, i) => (
              <div
                key={i}
                className={`relative p-6 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
                  plan.premium
                    ? "bg-gradient-gold border-gold/50 shadow-[0_0_40px_hsl(45_93%_58%/0.2)]"
                    : plan.popular
                    ? "bg-gradient-card border-gold/50 shadow-[0_0_30px_hsl(45_93%_58%/0.1)]"
                    : "bg-card border-border hover:border-gold/30"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gold text-xs font-semibold text-gold-foreground">
                    Popular
                  </div>
                )}
                {plan.premium && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gold text-xs font-semibold text-gold-foreground flex items-center gap-1">
                    <Star className="w-3 h-3" /> Premium
                  </div>
                )}
                <h4 className={`font-display font-bold text-lg mb-2 ${plan.premium ? "text-gold-foreground" : "text-foreground"}`}>
                  {plan.name}
                </h4>
                <div className={`text-3xl font-bold mb-1 ${plan.premium ? "text-gold-foreground" : "text-gradient-gold"}`}>
                  {plan.actions.toLocaleString()}
                </div>
                <p className={`text-sm mb-4 ${plan.premium ? "text-gold-foreground/70" : "text-muted-foreground"}`}>
                  ações completas
                </p>
                <div className={`text-xl font-semibold ${plan.premium ? "text-gold-foreground" : "text-foreground"}`}>
                  {plan.price}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {[
            { title: "Pagamento Seguro", desc: "Via WhatsApp com confirmação manual" },
            { title: "Trabalhadores Verificados", desc: "Contas reais e validadas" },
            { title: "Suporte 24/7", desc: "Atendimento via WhatsApp" },
          ].map((feature, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link to="/auth?type=client" className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-2">
            Começar Agora
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Plans;
