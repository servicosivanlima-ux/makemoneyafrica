import { Facebook, Instagram, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
const Footer = () => {
  return <footer className="bg-card border-t border-border py-12">
      <div className="container-app">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-lime flex items-center justify-center">
                <span className="font-display font-bold text-primary-foreground text-lg">M</span>
              </div>
              <span className="font-display font-bold text-xl text-foreground">Make Money With Lima</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-md mb-4">A plataforma Nº 1 em Angola para crescimento de redes sociais. Seguro, confiável e rentável para todos.</p>
            <div className="flex items-center gap-3">
              <a href="#" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Facebook className="w-4 h-4 text-muted-foreground" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Instagram className="w-4 h-4 text-muted-foreground" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Youtube className="w-4 h-4 text-muted-foreground" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Links Rápidos</h4>
            <ul className="space-y-2">
              <li><Link to="/#planos" className="text-muted-foreground hover:text-primary transition-colors text-sm">Planos</Link></li>
              <li><Link to="/auth?type=client" className="text-muted-foreground hover:text-primary transition-colors text-sm">Criar Campanha</Link></li>
              <li><Link to="/auth?type=worker" className="text-muted-foreground hover:text-primary transition-colors text-sm">Trabalhar e Ganhar</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Contacto</h4>
            <ul className="space-y-2">
              <li className="text-muted-foreground text-sm">
                WhatsApp: <span className="text-primary">+244 923 066 682</span>
              </li>
              <li className="text-muted-foreground text-sm">
                Luanda, Angola
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Make Money With Lima. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/termos" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Termos de Uso
            </Link>
            <Link to="/privacidade" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacidade
            </Link>
          </div>
        </div>
      </div>
    </footer>;
};
export default Footer;