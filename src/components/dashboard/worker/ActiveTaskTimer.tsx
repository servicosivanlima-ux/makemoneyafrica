import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ActiveTaskTimerProps {
    taskId: string;
    assignedAt: string;
    timeLimitMinutes?: number;
    onExpire: (taskId: string) => void;
}

const ActiveTaskTimer = ({ taskId, assignedAt, timeLimitMinutes = 15, onExpire }: ActiveTaskTimerProps) => {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!assignedAt) return;

        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const assignmentTime = new Date(assignedAt).getTime();
            const deadline = assignmentTime + timeLimitMinutes * 60 * 1000;
            const difference = deadline - now;

            if (difference <= 0) {
                setTimeLeft(0);
                onExpire(taskId);
                return;
            }

            setTimeLeft(Math.floor(difference / 1000));
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [taskId, assignedAt, timeLimitMinutes, onExpire]);

    if (timeLeft === null || timeLeft <= 0) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    // Warning color when less than 3 minutes
    const isWarning = minutes < 3;

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold ${isWarning
                ? "bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)] animate-pulse"
                : "bg-primary/10 text-primary border border-primary/20"
            }`}>
            <Clock className={`w-3.5 h-3.5 ${isWarning ? "animate-spin-slow" : ""}`} />
            <span>{minutes}:{seconds.toString().padStart(2, "0")} MINUTOS RESTANTES</span>
        </div>
    );
};

export default ActiveTaskTimer;
