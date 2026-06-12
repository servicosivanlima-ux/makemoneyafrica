import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xofpoelcmcfpzmkopecu.supabase.co'
const supabaseAnonKey = 'sb_publishable_YQTlgAkc0yDR8iqowq8K4Q_eqH8US9l'

console.log('Testing Supabase Fetch...')
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testFetch() {
    console.log('Attempting to fetch from "campaigns"...')
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Fetch Error:', error)
        if (error.message === 'Failed to fetch') {
            console.log('--- DIAGNOSIS: Network/CORS/VPN issue ---')
        }
    } else {
        console.log('Fetch Success! Data:', data)
    }

    console.log('Attempting to fetch from "profiles"...')
    const { data: pData, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)

    if (pError) {
        console.error('Profiles Fetch Error:', pError)
    } else {
        console.log('Profiles Fetch Success! Data:', pData)
    }
}

testFetch()
