import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Restricted from "@/pages/Restricted";
import { Loader2 } from "lucide-react";

interface GeoData {
    country_code: string;
    country_name: string;
    ip: string;
    org?: string; // ISP or Organization (often VPNs have hosting co names)
}

// Allowed countries: Angola, Mozambique, Brazil, Portugal
const ALLOWED_COUNTRIES = ["AO", "MZ", "BR", "PT"];

// Suspicious keywords for basic VPN/Proxy detection via ISP name
// This is a basic heuristic. For production, use a dedicated VPN API.
const VPN_KEYWORDS = ["VPN", "Proxy", "Datacenter", "Hosting", "Cloud", "Tor Exit"];

const RegionGate = ({ children }: { children: React.ReactNode }) => {
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [reason, setReason] = useState<"region" | "vpn">("region");
    const location = useLocation();

    useEffect(() => {
        // Skip check for restricted page to avoid loops if we were navigating there (though we render conditionally)

        const checkRegion = async () => {
            try {
                const response = await fetch("https://ipapi.co/json/");
                if (!response.ok) {
                    // If API fails, we might default to allow or block. 
                    // For safety in this demo, let's allow, but log error.
                    // Or better, retry. For now, let's assume allow on error to not brick app if API is down.
                    console.error("GeoAPI Error");
                    setLoading(false);
                    return;
                }

                const data: GeoData = await response.json();

                // 1. Check VPN/Proxy via Org string heuristic
                const isVpn = data.org && VPN_KEYWORDS.some(keyword =>
                    data.org!.toLowerCase().includes(keyword.toLowerCase())
                );

                if (isVpn) {
                    setReason("vpn");
                    setAccessDenied(true);
                    setLoading(false);
                    return;
                }

                // 2. Check Country
                if (!ALLOWED_COUNTRIES.includes(data.country_code)) {
                    setReason("region");
                    setAccessDenied(true);
                    setLoading(false);
                    return;
                }

                // Allowed
                setLoading(false);
            } catch (error) {
                console.error("GeoCheck Failed", error);
                // Fallback: Allow access if check fails (UX preference) OR Block (Security preference)
                // User asked to "activate control", so maybe block if unsure? 
                // Let's default to ALLOW with a warning in console for now to avoid locking the user out during dev if API fails.
                setLoading(false);
            }
        };

        checkRegion();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-muted-foreground text-sm uppercase tracking-widest animate-pulse">
                        Verificando Disponibilidade...
                    </p>
                </div>
            </div>
        );
    }

    if (accessDenied) {
        return <Restricted reason={reason} />;
    }

    return <>{children}</>;
};

export default RegionGate;
