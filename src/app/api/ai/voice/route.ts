/**
 * AI Voice API — Text-to-Speech Fallback
 * 
 * POST /api/ai/voice
 * 
 * Primary TTS is handled by the browser's SpeechSynthesis API (₹0 cost).
 * This API is a server-side fallback using ElevenLabs if configured.
 * 
 * In practice, the widget handles TTS in-browser. This endpoint
 * exists for future use (e.g., generating audio files for download).
 */

export async function POST(req: Request) {
    try {
        const { text, language = 'en' } = await req.json();

        if (!text || typeof text !== 'string') {
            return Response.json({ error: 'Text is required' }, { status: 400 });
        }

        const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

        // Voice ID mapping
        const voiceMap: Record<string, string> = {
            en: 'pNInz6obpgDQGcFmaJgB',    // Adam - Warm male English
            hi: 'onwK4e9ZLuTAKqWW03F9',    // Daniel - Deep multilingual
            mr: 'onwK4e9ZLuTAKqWW03F9',    // Fallback to Daniel
        };

        if (!ELEVENLABS_API_KEY) {
            // Return instruction for browser-based TTS
            return Response.json({
                useBrowserTTS: true,
                text,
                language,
                message: 'No ElevenLabs API key configured. Use browser SpeechSynthesis.',
            });
        }

        const voiceId = voiceMap[language] || voiceMap['en'];

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.6,
                    similarity_boost: 0.75,
                    style: 0.3,
                    use_speaker_boost: true,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Voice API] ElevenLabs error:', errorText);
            return Response.json({
                useBrowserTTS: true,
                text,
                language,
                error: 'ElevenLabs API failed, falling back to browser TTS',
            });
        }

        const audioBuffer = await response.arrayBuffer();

        return new Response(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error: any) {
        console.error('[Voice API] Error:', error);
        return Response.json({
            useBrowserTTS: true,
            error: error.message,
        }, { status: 500 });
    }
}
