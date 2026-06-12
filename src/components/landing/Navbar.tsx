import { Menu, X, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "py-3 glass-card border-b border-border" : "py-5 bg-transparent"
        }`}
    >
      <div className="container-app">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="+Kumbú"
              className="w-12 h-12 object-contain group-hover:scale-110 transition-transform duration-300"
            />
            <div className="flex flex-col">
              <span className="font-display font-black text-2xl text-foreground leading-none tracking-tighter">
                +Kumbú
              </span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-black">Angola</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <a href="#planos" className="nav-link">
              Planos
            </a>
            <a href="#simulador" className="nav-link">
              Simulador
            </a>
            <Link to="/auth?type=client&signup=true" className="nav-link">
              Quero ser cliente
            </Link>
            <Link to="/auth?type=worker&signup=true" className="nav-link">
              Quero ser trabalhador
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-2 px-3 py-1.5 glass-card-lime rounded-full text-[10px] font-bold border border-primary/20">
              <img src="/angola-flag.png" alt="AO" className="w-4 h-4 object-contain rounded-full shadow-sm" />
              <span className="text-foreground">AOA (KZ)</span>
            </div>
            <Link to="/auth" className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
              Entrar
            </Link>
            <Link to="/auth?signup=true" className="btn-premium py-2.5 px-6 text-sm flex items-center gap-2">
              Começar Agora
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl glass-card border-border transition-all active:scale-90"
            >
              {isOpen ? <X className="w-6 h-6 text-primary" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden bg-background/95 backdrop-blur-xl border-t border-border mt-4 rounded-2xl"
            >
              <div className="py-6 flex flex-col gap-4 px-2">
                <a
                  href="#planos"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-3 text-lg font-medium hover:bg-card/60 rounded-xl transition-colors"
                >
                  Planos
                </a>
                <a
                  href="#simulador"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-3 text-lg font-medium hover:bg-card/60 rounded-xl transition-colors"
                >
                  Simulador
                </a>
                <Link
                  to="/auth?type=client&signup=true"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-3 text-lg font-medium hover:bg-card/60 rounded-xl transition-colors"
                >
                  Quero ser cliente
                </Link>
                <Link
                  to="/auth?type=worker&signup=true"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-3 text-lg font-medium hover:bg-card/60 rounded-xl transition-colors"
                >
                  Quero ser trabalhador
                </Link>
                <div className="flex flex-col gap-3 pt-4 border-t border-border mt-2">
                  <Link to="/auth" className="btn-outline-premium text-center">
                    Entrar
                  </Link>
                  <Link to="/auth?signup=true" className="btn-premium text-center">
                    Registar Grátis
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;
