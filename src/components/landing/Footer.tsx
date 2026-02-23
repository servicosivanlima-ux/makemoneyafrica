import { Facebook, Music2, Youtube, Mail, MapPin, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer className="relative bg-background border-t border-white/5 pt-24 pb-12 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container-app relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-4 mb-8 group">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-14 h-14 object-contain drop-shadow-neon group-hover:rotate-6 transition-transform duration-500"
              />
              <div className="flex flex-col">
                <span className="font-display font-bold text-2xl text-foreground tracking-tighter">
                  Make Money
                </span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-black">With Lima</span>
              </div>
            </Link>
            <p className="text-muted-foreground text-lg max-w-md mb-10 leading-relaxed">
              A maior ponte tecnológica entre criadores e trabalhadores em Angola.
              Transformando o engajamento digital em liberdade financeira real.
            </p>
            <div className="flex items-center gap-4">
              {[
                { icon: Facebook, link: "https://www.facebook.com/profile.php?id=61586742401619" },
                { icon: Music2, link: "https://www.tiktok.com/@vemsaber.tv" },
                { icon: Youtube, link: "https://www.youtube.com/@LetrasDigitais2026" },
              ].map((social, i) => (
                <a
                  key={i}
                  href={social.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-2xl glass-card border-white/5 flex items-center justify-center hover:bg-primary/20 hover:border-primary/40 transition-all duration-300 group"
                >
                  <social.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-black text-foreground uppercase tracking-widest mb-8">Navegação</h4>
            <ul className="space-y-4">
              {[
                { label: "Planos", path: "/#planos" },
                { label: "Quero ser cliente", path: "/auth?type=client" },
                { label: "Quero ser trabalhador", path: "/auth?type=worker" },
                { label: "Simulador", path: "/#simulador" }
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.path}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium flex items-center gap-2 group"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover:bg-primary transition-colors" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Local */}
          <div>
            <h4 className="text-sm font-black text-foreground uppercase tracking-widest mb-8">Suporte & Legal</h4>
            <ul className="space-y-4 mb-8">
              <li>
                <Link to="/termos#aceitacao" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Termos de Uso</Link>
              </li>
              <li>
                <Link to="/termos#privacidade" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Privacidade</Link>
              </li>
            </ul>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Luanda, Angola</span>
                <img src="/angola-flag.png" alt="AO" className="w-4 h-4 object-contain rounded-full" />
              </div>
              <a href="mailto:suporte@makemoney.ao" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Mail className="w-4 h-4 text-primary" />
                <span>suporte@makemoney.ao</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-bold">
              © {new Date().getFullYear()} Make Money With Lima. A revolução digital angolana. Actualidade garantida.
            </p>
            <div className="flex items-center justify-center md:justify-start gap-2 group cursor-default">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Desenvolvido por</span>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/5 group-hover:border-primary/20 transition-colors">
                <img src="/bytekwanza-logo.png" alt="ByteKwanza" className="h-4 w-auto object-contain" />
                <span className="text-[10px] font-black tracking-tight text-white">ByteKwanza</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-full border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">+18 ANOS</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Servidores Online</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;