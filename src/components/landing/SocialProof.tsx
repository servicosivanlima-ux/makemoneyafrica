import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, TrendingUp, Users, Wallet, CheckCircle2 } from 'lucide-react';

const NAMES = [
    "Manuel Silva", "Paulo Tiago", "José Erikson", "Maria Lima", "Ana Santos",
    "António Rocha", "Filomena Costa", "Domingos Neto", "Isabel Matos", "Pedro Garcia",
    "Teresa Viana", "Lucas Mendes", "Sara Oliveira", "João Paulo", "Cláudia Bento"
];

const ACTIONS = [
    { type: 'client', message: (name: string) => `**${name}** (Cliente) acabou de criar uma nova campanha`, icon: TrendingUp, color: 'text-primary' },
    { type: 'worker', message: (name: string) => `**${name}** (Trabalhador) concluiu a tarefa e recebeu ${Math.floor(Math.random() * 500 + 100)} kz`, icon: CheckCircle2, color: 'text-primary' },
    { type: 'worker_payout', message: (name: string) => `**${name}** (Trabalhador) atingiu o limite para saque`, icon: Wallet, color: 'text-yellow-500' },
    { type: 'withdrawal', message: (name: string) => `**${name}** (Trabalhadora) Levantou ${(Math.floor(Math.random() * 10000 + 1000)).toLocaleString()} Akz`, icon: Wallet, color: 'text-yellow-500' },
    { type: 'client_multi', message: (name: string) => `**${name}** (Cliente) Criou ${Math.floor(Math.random() * 5 + 2)} novas campanhas`, icon: Bell, color: 'text-blue-500' }
];

const SocialProof = () => {
    const [currentNotification, setCurrentNotification] = useState<any>(null);

    const showRandomNotification = () => {
        const randomName = NAMES[Math.floor(Math.random() * NAMES.length)];
        const randomAction = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];

        setCurrentNotification({
            id: Date.now(),
            name: randomName,
            action: randomAction,
            text: randomAction.message(randomName)
        });

        // Auto hide after 6 seconds
        setTimeout(() => {
            setCurrentNotification(null);
            // Plan next notification between 1m (60000ms) and 5m (300000ms)
            const nextTime = Math.floor(Math.random() * (300000 - 60000 + 1) + 60000);
            setTimeout(showRandomNotification, nextTime);
        }, 6000);
    };

    useEffect(() => {
        // Initial delay before first notification (e.g., 5 seconds)
        const timer = setTimeout(showRandomNotification, 5000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed bottom-6 left-6 z-[100] pointer-events-none sm:max-w-xs w-[calc(100%-3rem)]">
            <AnimatePresence mode='wait'>
                {currentNotification && (
                    <motion.div
                        key={currentNotification.id}
                        initial={{ opacity: 0, x: -50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.95 }}
                        className="pointer-events-auto bg-background/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-start gap-4"
                    >
                        <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 ${currentNotification.action.color}`}>
                            <currentNotification.action.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div
                                className="text-xs text-muted-foreground leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: currentNotification.text.replace(/\*\*(.*?)\*\*/g, '<span class="text-foreground font-bold">$1</span>') }}
                            />
                            <p className="text-[10px] text-muted-foreground/50 mt-1 uppercase font-black tracking-widest">Agora mesmo</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SocialProof;
