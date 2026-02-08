
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runTest() {
    try {
        const envPath = join(__dirname, '.env');
        const envContent = await readFile(envPath, 'utf8');

        const env = {};
        envContent.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length === 2) {
                env[parts[0].trim()] = parts[1].trim().replace(/^"(.*)"$/, '$1');
            }
        });

        const supabaseUrl = env.VITE_SUPABASE_URL;
        const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing Supabase environment variables');
            process.exit(1);
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log('Testing connection to:', supabaseUrl);
        const { data, error, status } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Connection failed:', error.message);
            console.error('Status Code:', status);
        } else {
            console.log('✅ Connection successful!');
            console.log('Status Code:', status);
        }
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

runTest();
