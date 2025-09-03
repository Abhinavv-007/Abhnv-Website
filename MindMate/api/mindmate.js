// In the file: /api/mindmate.js

import fetch from 'node-fetch';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: { message: 'Method Not Allowed' } });
    }

    const API_KEY = process.env.GOOGLE_API_KEY;

    if (!API_KEY) {
        return response.status(500).json({ error: { message: 'API key is not configured.' } });
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;
    
    try {
        const payload = request.body;

        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            console.error('Google API Error:', data);
            return response.status(apiResponse.status).json(data);
        }

        return response.status(200).json(data);

    } catch (error) {
        console.error('Serverless Function Error:', error);
        return response.status(500).json({ error: { message: 'An internal error occurred.' } });
    }
}