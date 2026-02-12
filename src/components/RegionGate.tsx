import { useEffect, useState } from "react";
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
const VPN_KEYWORDS = ["VPN", "Proxy", "Datacenter", "Hosting", "Cloud", "Tor Exit"];

const RegionGate = ({ children }: { children: React.ReactNode }) => {
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [reason, setReason] = useState<"region" | "vpn">("region");

    useEffect(() => {
        const checkRegion = async () => {
            try {
                // Check if already checked in this session
                const cachedResult = sessionStorage.getItem("geo_access_v2");
                if (cachedResult === "allowed") {
                    setLoading(false);
                    return;
                }

                // Clear old cache key if exists
                sessionStorage.removeItem("geo_access");

                // Skip for localhost/development
                if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
                    setLoading(false);
                    return;
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

                let data: GeoData | null = null;
                let usedFallback = false;

                // Attempt 1: ipapi.co
                try {
                    const response = await fetch("https://ipapi.co/json/", { signal: controller.signal });
                    if (!response.ok) throw new Error("Primary API Error");
                    const raw = await response.json();
                    if (raw.error) throw new Error(raw.reason || "API Error");
                    data = {
                        country_code: raw.country_code,
                        country_name: raw.country_name,
                        ip: raw.ip,
                        org: raw.org
                    };
                } catch (primaryError) {
                    console.warn("Primary GeoAPI failed, using fallback...", primaryError);
                    usedFallback = true;
                    // Attempt 2: ipwho.is
                    try {
                        const response = await fetch("https://ipwho.is/", { signal: controller.signal });
                        if (!response.ok) throw new Error("Backup API Error");
                        const raw = await response.json();
                        if (!raw.success) throw new Error(raw.message || "API Error");

                        data = {
                            country_code: raw.country_code,
                            country_name: raw.country,
                            ip: raw.ip,
                            org: raw.connection?.org || raw.connection?.isp
                        };
                    } catch (backupError) {
                        console.error("All GeoAPIs failed", backupError);
                        throw new Error("GeoLocation Unavailable");
                    }
                } finally {
                    clearTimeout(timeoutId);
                }

                if (!data) throw new Error("No GeoData received");

                console.log("[RegionGate] Checked:", {
                    country: data.country_code,
                    ip: data.ip,
                    org: data.org,
                    source: usedFallback ? "backup" : "primary"
                });

                // 1. Check VPN/Proxy via Org string heuristic
                const isVpn = data.org && VPN_KEYWORDS.some(keyword =>
                    data.org!.toLowerCase().includes(keyword.toLowerCase())
                );

                if (isVpn) {
                    console.warn("[RegionGate] Blocked: VPN Detected", data.org);
                    setReason("vpn");
                    setAccessDenied(true);
                    setLoading(false);
                    return;
                }

                // 2. Extra Security: Check Browser Timezone for explicit UK mismatch
                const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                // Only block if strictly London/Dublin
                if (userTimezone === "Europe/London" || userTimezone === "Europe/Dublin") {
                    console.warn("[RegionGate] Blocked: Timezone Suspicious", userTimezone);
                    setReason("region");
                    setAccessDenied(true);
                    setLoading(false);
                    return;
                }

                // 3. Check Country
                if (!ALLOWED_COUNTRIES.includes(data.country_code)) {
                    console.warn("[RegionGate] Blocked: Country Not Allowed", data.country_code);
                    setReason("region");
                    setAccessDenied(true);
                    setLoading(false);
                    return;
                }

                // Allowed
                console.log("[RegionGate] Access Granted");
                sessionStorage.setItem("geo_access_v2", "allowed");
                setLoading(false);

            } catch (err) {
                console.error("Critical Region Check Failure:", err);
                // FAIL-OPEN STRATEGY (TEMPORARY FOR DIAGNOSIS) -> CHANGE TO TRUE TO BLOCK
                // If the API fails completely, we are BLOCKING to maintain security as requested
                // "O resto pode manter inacessivel"
                setReason("region");
                setAccessDenied(true);
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
