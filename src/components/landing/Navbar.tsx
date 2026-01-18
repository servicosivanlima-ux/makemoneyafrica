import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container-app">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-lime flex items-center justify-center">
              <span className="font-display font-bold text-primary-foreground">M</span>
            </div>
            <span className="font-display font-bold text-lg text-foreground hidden sm:block">
              Make Money With Lima
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#planos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Planos
            </a>
            <Link to="/auth?type=client" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Para Clientes
            </Link>
            <Link to="/auth?type=worker" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Para Trabalhadores
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth" className="btn-secondary text-sm px-4 py-2">
              Entrar
            </Link>
            <Link to="/auth?signup=true" className="btn-primary text-sm px-4 py-2">
              Cadastrar
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden border-t border-border py-4 space-y-4">
            <a
              href="#planos"
              onClick={() => setIsOpen(false)}
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Planos
            </a>
            <Link
              to="/auth?type=client"
              onClick={() => setIsOpen(false)}
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Para Clientes
            </Link>
            <Link
              to="/auth?type=worker"
              onClick={() => setIsOpen(false)}
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Para Trabalhadores
            </Link>
            <div className="flex gap-3 pt-4">
              <Link to="/auth" className="btn-secondary text-sm px-4 py-2 flex-1 text-center">
                Entrar
              </Link>
              <Link to="/auth?signup=true" className="btn-primary text-sm px-4 py-2 flex-1 text-center">
                Cadastrar
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
