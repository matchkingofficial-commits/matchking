// /api/auth/login.js
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase via Vercel Environment Variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
    // Standard CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Capture the exact keys your inline script sends: email and device_fp
    const { email, device_fp } = req.body;

    if (!email || !device_fp) {
        return res.status(400).json({ error: 'Email and Device Fingerprint signatures are required.' });
    }

    try {
        const cleanEmail = email.toLowerCase().trim();

        // 1. Look up the user by email in your whitelisted database
        const { data: user, error } = await supabase
            .from('allowed_users')
            .select('*')
            .eq('email', cleanEmail)
            .single();

        if (error || !user) {
            return res.status(403).json({ error: 'Access denied. Email not whitelisted on this terminal.' });
        }

        // 2. Hardware Fingerprint Lock Check
        if (user.fingerprint && user.fingerprint !== device_fp) {
            return res.status(401).json({ error: 'Device Lock Conflict. This terminal session is locked to another hardware layout.' });
        }

        // 3. First time logging in? Securely bind their device fingerprint forever
        if (!user.fingerprint) {
            await supabase
                .from('allowed_users')
                .update({ fingerprint: device_fp })
                .eq('email', cleanEmail);
        }

        // 4. Generate a signed 24-hour authorization session token 
        const payload = JSON.stringify({ email: cleanEmail, exp: Date.now() + (24 * 60 * 60 * 1000) });
        const signature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'fallback-secret')
                                .update(payload)
                                .digest('hex');

        const sessionToken = `${signature}.${Buffer.from(payload).toString('base64')}`;

        // 5. Return exactly what your inline script looks for: data.token and data.email
        return res.status(200).json({
            success: true,
            token: sessionToken,
            email: cleanEmail
        });

    } catch (err) {
        console.error('System error:', err);
        return res.status(500).json({ error: 'Internal operational system error.' });
    }
}