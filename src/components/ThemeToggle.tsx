import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();
    const [showMoney, setShowMoney] = useState(false);

    const handleToggle = () => {
        setTheme(theme === "dark" ? "light" : "dark");
        setShowMoney(true);
        setTimeout(() => setShowMoney(false), 1000);
    };

    return (
        <button
            onClick={handleToggle}
            className="relative p-2 rounded-xl glass-card border-white/5 hover:border-primary/40 transition-all duration-300 group overflow-hidden"
            aria-label="Toggle Theme"
        >
            <AnimatePresence>
                {showMoney && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.5 }}
                        animate={{ opacity: 1, y: -40, scale: 1.2 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none text-xl z-50"
                    >
                        💸
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={false}
                animate={{
                    rotate: theme === "dark" ? 0 : 90,
                    scale: theme === "dark" ? 1 : 0,
                    opacity: theme === "dark" ? 1 : 0,
                }}
                transition={{ duration: 0.3 }}
                className="text-primary"
            >
                <Moon className="w-5 h-5" />
            </motion.div>
            <motion.div
                initial={false}
                animate={{
                    rotate: theme === "dark" ? -90 : 0,
                    scale: theme === "dark" ? 0 : 1,
                    opacity: theme === "dark" ? 0 : 1,
                }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center text-yellow-500"
            >
                <Sun className="w-5 h-5" />
            </motion.div>
        </button>
    );
};

export default ThemeToggle;
