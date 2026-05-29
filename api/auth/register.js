import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Extract email, token, AND the adminPassword from the frontend request
    const { email, token, adminPassword } = req.body;

    // SECURITY CHECK: Verify the password matches your Vercel Environment Variable
    if (!adminPassword || adminPassword !== process.env.ADMIN_SECRET_PASSWORD) {
        return res.status(401).json({ error: 'Access denied. Invalid Admin Password.' });
    }

    if (!email || !token) {
        return res.status(400).json({ error: 'Both Email and Token fields are required.' });
    }

    try {
        const { data, error } = await supabase
            .from('allowed_users')
            .insert([
                { 
                    email: email.toLowerCase().trim(), 
                    token: token.trim(), 
                    fingerprint: null 
                }
            ]);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.status(200).json({ success: true, message: 'Client successfully whitelisted!' });

    } catch (err) {
        return res.status(500).json({ error: 'Internal server error.' });
    }
}