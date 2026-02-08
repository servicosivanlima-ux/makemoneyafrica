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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "py-3 glass-card border-b border-white/10" : "py-5 bg-transparent"
        }`}
    >
      <div className="container-app">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-neon group-hover:scale-110 transition-transform duration-300">
              <span className="font-display font-black text-primary-foreground transform group-hover:rotate-12 transition-transform">M</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-xl text-foreground leading-none tracking-tighter">
                Make Money
              </span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-black">With Lima</span>
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
            <Link to="/auth?type=client" className="nav-link">
              Quero ser cliente
            </Link>
            <Link to="/auth?type=worker" className="nav-link">
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
              className="p-2 rounded-xl glass-card border-white/10 transition-all active:scale-90"
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
              className="lg:hidden overflow-hidden bg-background/95 backdrop-blur-xl border-t border-white/5 mt-4 rounded-2xl"
            >
              <div className="py-6 flex flex-col gap-4 px-2">
                <a
                  href="#planos"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-3 text-lg font-medium hover:bg-white/5 rounded-xl transition-colors"
                >
                  Planos
                </a>
                <a
                  href="#simulador"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-3 text-lg font-medium hover:bg-white/5 rounded-xl transition-colors"
                >
                  Simulador
                </a>
                <Link
                  to="/auth?type=client"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-3 text-lg font-medium hover:bg-white/5 rounded-xl transition-colors"
                >
                  Quero ser cliente
                </Link>
                <Link
                  to="/auth?type=worker"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-3 text-lg font-medium hover:bg-white/5 rounded-xl transition-colors"
                >
                  Quero ser trabalhador
                </Link>
                <div className="flex flex-col gap-3 pt-4 border-t border-white/5 mt-2">
                  <Link to="/auth" className="btn-outline-premium text-center">
                    Entrar
                  </Link>
                  <Link to="/auth?signup=true" className="btn-premium text-center">
                    Cadastrar Grátis
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
