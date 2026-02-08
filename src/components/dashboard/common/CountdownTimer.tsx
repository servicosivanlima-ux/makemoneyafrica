import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";

interface CountdownTimerProps {
    scheduledDeletionAt: string | null;
    onExpire: () => void;
}

const CountdownTimer = ({ scheduledDeletionAt, onExpire }: CountdownTimerProps) => {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!scheduledDeletionAt) return;

        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const deletionTime = new Date(scheduledDeletionAt).getTime();
            const difference = deletionTime - now;

            if (difference <= 0) {
                setTimeLeft(0);
                onExpire();
                return;
            }

            setTimeLeft(Math.floor(difference / 1000));
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [scheduledDeletionAt, onExpire]);

    if (timeLeft === null || timeLeft <= 0) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div className="flex items-center gap-2 px-2 py-1 rounded bg-red-500/10 text-red-500 text-[10px] font-bold animate-pulse">
            <Trash2 className="w-3 h-3" />
            <span>EXCLUINDO EM {minutes}:{seconds.toString().padStart(2, "0")}</span>
        </div>
    );
};

export default CountdownTimer;
