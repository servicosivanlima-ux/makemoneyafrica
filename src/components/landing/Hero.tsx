import { Shield, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";
const Hero = () => {
  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-dark">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-float" style={{
        animationDelay: "1s"
      }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
        backgroundImage: "linear-gradient(hsl(82 85% 50% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(82 85% 50% / 0.3) 1px, transparent 1px)",
        backgroundSize: "60px 60px"
      }} />
      </div>

      <div className="container-app relative z-10 py-20">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-lime mb-8 animate-fade-in">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-medium text-primary">Plataforma de Crescimento Social Nº1 em Angola</span>
          </div>

          {/* Main heading */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in" style={{
          animationDelay: "0.1s"
        }}>
            <span className="text-foreground">Faça Dinheiro com</span>
            <br />
            <span className="text-gradient-lime">Make Money With Lima</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in" style={{
          animationDelay: "0.2s"
        }}>
            Cresça suas redes sociais com campanhas profissionais ou ganhe dinheiro completando tarefas simples. 
            Seguro, rápido e confiável.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in" style={{
          animationDelay: "0.3s"
        }}>
            <Link to="/auth?type=client" className="btn-primary text-lg px-8 py-4 w-full sm:w-auto flex items-center justify-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Criar Campanha
            </Link>
            <Link to="/auth?type=worker" className="btn-gold text-lg px-8 py-4 w-full sm:w-auto flex items-center justify-center gap-2">
              <Users className="w-5 h-5" />
              Trabalhar e Ganhar
            </Link>
          </div>

          {/* Warning Banner */}
          <div className="glass border border-destructive/30 rounded-xl p-6 max-w-3xl mx-auto animate-fade-in" style={{
          animationDelay: "0.4s"
        }}>
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 text-destructive flex-shrink-0 mt-1" />
              <div className="text-left">
                <h3 className="font-display font-semibold text-destructive mb-2">Aviso de Segurança</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Qualquer tentativa de fraude, uso de prints falsos, contas falsas ou manipulação de provas 
                  resultará em <span className="text-destructive font-semibold">bloqueio imediato e permanente</span> na plataforma.
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto mt-16 animate-fade-in" style={{
          animationDelay: "0.5s"
        }}>
            {[{
            value: "10K+",
            label: "Campanhas"
          }, {
            value: "50K+",
            label: "Trabalhadores"
          }, {
            value: "100M+ Kz",
            label: "Pagos"
          }].map((stat, i) => <div key={i} className="text-center">
                <div className="font-display text-2xl sm:text-4xl font-bold text-gradient-lime mb-1">{stat.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
              </div>)}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-primary rounded-full animate-pulse" />
        </div>
      </div>
    </section>;
};
export default Hero;