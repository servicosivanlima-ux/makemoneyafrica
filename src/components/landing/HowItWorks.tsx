import { Briefcase, CheckCircle, CreditCard, FileText, Target, Upload, Users, Wallet } from "lucide-react";

const HowItWorks = () => {
  const clientSteps = [
    {
      icon: FileText,
      title: "1. Escolha o Plano",
      description: "Selecione entre 'Tá no Limão' (seguidores) ou 'Kwanza' (engajamento completo)",
    },
    {
      icon: Target,
      title: "2. Configure a Campanha",
      description: "Escolha a plataforma e insira os links do perfil ou conteúdo a promover",
    },
    {
      icon: CreditCard,
      title: "3. Confirme o Pagamento",
      description: "Envie o comprovativo via WhatsApp e aguarde a aprovação",
    },
    {
      icon: CheckCircle,
      title: "4. Acompanhe o Progresso",
      description: "Visualize em tempo real o crescimento da sua campanha",
    },
  ];

  const workerSteps = [
    {
      icon: Users,
      title: "1. Cadastre-se",
      description: "Preencha seus dados e links das suas redes sociais válidas",
    },
    {
      icon: Target,
      title: "2. Veja as Tarefas",
      description: "Acesse tarefas disponíveis das plataformas que você cadastrou",
    },
    {
      icon: Upload,
      title: "3. Complete e Comprove",
      description: "Execute a tarefa e faça upload dos prints como prova",
    },
    {
      icon: Wallet,
      title: "4. Receba seu Dinheiro",
      description: "Após aprovação, solicite saque para IBAN ou Multicaixa Express",
    },
  ];

  return (
    <section className="section-padding bg-background relative">
      <div className="container-app">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Como Funciona
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Simples, Rápido e <span className="text-gradient-lime">Seguro</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Seja você um cliente ou trabalhador, o processo é transparente e fácil de seguir.
          </p>
        </div>

        {/* Two columns */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* For Clients */}
          <div className="card-elevated p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-lime flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">Para Clientes</h3>
                <p className="text-sm text-muted-foreground">Cresça suas redes sociais</p>
              </div>
            </div>

            <div className="space-y-6">
              {clientSteps.map((step, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">{step.title}</h4>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* For Workers */}
          <div className="card-elevated p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center">
                <Wallet className="w-6 h-6 text-gold-foreground" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">Para Trabalhadores</h3>
                <p className="text-sm text-muted-foreground">Ganhe dinheiro com tarefas</p>
              </div>
            </div>

            <div className="space-y-6">
              {workerSteps.map((step, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-gold/10 transition-colors">
                    <step.icon className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">{step.title}</h4>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
