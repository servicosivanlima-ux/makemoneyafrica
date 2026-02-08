
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    console.log('URL:', supabaseUrl);
    console.log('Key:', supabaseKey ? 'PRESENT' : 'MISSING');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing connection to:', supabaseUrl);
    try {
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

test();
