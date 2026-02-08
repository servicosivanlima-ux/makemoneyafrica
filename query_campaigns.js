import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xofpoelcmcfpzmkopecu.supabase.co";
const SUPABASE_KEY = "sb_publishable_YQTlgAkc0yDR8iqowq8K4Q_eqH8US9l";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log("Querying campaigns...");
    const { data, error } = await supabase
        .from('campaigns')
        .select('id, plan_name, status, client_id, created_at')
        .eq('status', 'cancelled');

    if (error) {
        console.error("Error querying campaigns:", error);
        return;
    }

    console.log("Cancelled campaigns found:", JSON.stringify(data, null, 2));
}

run();
