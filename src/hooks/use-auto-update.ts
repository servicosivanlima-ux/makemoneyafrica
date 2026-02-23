import { useEffect } from 'react';

/**
 * Hook to handle silent automatic updates.
 * It periodically checks if the application has a new version available
 * by fetching the index.html and checking for changes in script hashes.
 */
export const useAutoUpdate = () => {
    useEffect(() => {
        // Only run in production to avoid interfering with HMR in development
        if (import.meta.env.DEV) return;

        const CHECK_INTERVAL = 1000 * 60 * 15; // Check every 15 minutes
        let lastScriptHash: string | null = null;

        const getScriptHash = (html: string) => {
            // Find the main entry script (usually contains /assets/index-*.js)
            const match = html.match(/\/assets\/index-[a-zA-Z0-9_-]+\.js/);
            return match ? match[0] : null;
        };

        const checkForUpdates = async () => {
            try {
                const response = await fetch('/?t=' + Date.now(), { cache: 'no-store' });
                const html = await response.text();
                const currentHash = getScriptHash(html);

                if (lastScriptHash && currentHash && lastScriptHash !== currentHash) {
                    console.log('New version detected! Updating automatically...');
                    // Reload silently
                    window.location.reload();
                } else {
                    lastScriptHash = currentHash;
                }
            } catch (error) {
                console.error('Failed to check for updates:', error);
            }
        };

        // Initial check
        checkForUpdates();

        // Periodic check
        const interval = setInterval(checkForUpdates, CHECK_INTERVAL);

        return () => clearInterval(interval);
    }, []);
};
