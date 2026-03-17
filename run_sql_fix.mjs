import pg from 'pg';
import { readFileSync } from 'fs';

const client = new pg.Client({
    host: 'db.xofpoelcmcfpzmkopecu.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'MPLA1975mpla#',
    ssl: { rejectUnauthorized: false }
});

try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL');

    const sql = readFileSync('./supabase/FIX_YOUTUBE_VIDEO_SESSIONS.sql', 'utf8');

    await client.query(sql);
    console.log('SQL executed successfully!');

    // Verify the table and functions were created
    const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'video_sessions'`);
    console.log('video_sessions table exists:', tables.rows.length > 0);

    const funcs = await client.query(`SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname IN ('start_video_session', 'validate_video_task') ORDER BY proname`);
    console.log('Functions created:', funcs.rows.map(r => r.proname).join(', '));

} catch (err) {
    console.error('Error:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    if (err.position) console.error('Position:', err.position);
} finally {
    await client.end();
}
