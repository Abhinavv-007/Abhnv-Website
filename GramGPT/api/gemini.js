// This is the full code for: /api/gemini.js

import fetch from 'node-fetch';

// This is the main serverless function.
// Vercel automatically runs this code when someone visits /api/gemini
export default async function handler(request, response) {
    // We only want to allow POST requests to this endpoint
    if (request.method !== 'POST') {
        return response.status(405).json({ error: { message: 'Method Not Allowed' } });
    }

    // Get the secret API key from the Environment Variables you will set on Vercel
    const API_KEY = process.env.GOOGLE_API_KEY;

    // A safety check to make sure the key is configured
    if (!API_KEY) {
        return response.status(500).json({ error: { message: 'API key is not configured.' } });
    }

    // This is the same Google API URL as before
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;
    
    try {
        // Get the user's message from the request body
        const payload = request.body;

        // Call the Google Gemini API (same as before)
        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Get the data from Google's response
        const data = await apiResponse.json();

        // If Google's API returned an error, send that error back
        if (!apiResponse.ok) {
            console.error('Google API Error:', data);
            return response.status(apiResponse.status).json(data);
        }

        // Send the successful response back to your website
        return response.status(200).json(data);

    } catch (error) {
        console.error('Serverless Function Error:', error);
        return response.status(500).json({ error: { message: 'An internal error occurred.' } });
    }
}