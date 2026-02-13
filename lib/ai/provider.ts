/**
 * Unified AI Provider — Zero-Cost Intelligence Layer
 * 
 * DEV:  Ollama (localhost:11434) with Mistral
 * PROD: Groq Free Tier (llama-3.3-70b-versatile)
 * 
 * Both use OpenAI-compatible chat completion format.
 * Switching is automatic based on AI_PROVIDER env or auto-detection.
 */

export interface AiMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AiCompletionOptions {
    messages: AiMessage[];
    temperature?: number;
    maxTokens?: number;
    /** Force JSON output mode */
    jsonMode?: boolean;
}

export interface AiResponse {
    text: string;
    provider: 'ollama' | 'groq' | 'openai';
    model: string;
    latencyMs: number;
}

// ============================================
// Provider Configuration
// ============================================

const PROVIDERS = {
    ollama: {
        baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'mistral',
        name: 'ollama' as const,
    },
    groq: {
        baseUrl: 'https://api.groq.com/openai/v1',
        model: 'llama-3.3-70b-versatile',
        name: 'groq' as const,
    },
    openai: {
        baseUrl: 'https://api.openai.com/v1',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        name: 'openai' as const,
    },
};

// ============================================
// Auto-Detection
// ============================================

let _cachedProvider: 'ollama' | 'groq' | 'openai' | null = null;

async function isOllamaRunning(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${PROVIDERS.ollama.baseUrl}/api/tags`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Detect which AI provider to use.
 * Priority: AI_PROVIDER env → auto-detect Ollama → fallback to Groq
 */
export async function detectProvider(): Promise<'ollama' | 'groq' | 'openai'> {
    // Cache the detection
    if (_cachedProvider) return _cachedProvider;

    // Explicit env override
    const envProvider = process.env.AI_PROVIDER?.toLowerCase();
    if (envProvider === 'ollama' || envProvider === 'groq' || envProvider === 'openai') {
        _cachedProvider = envProvider as any;
        console.log(`[AI] Provider locked via env: ${envProvider}`);
        return _cachedProvider!;
    }

    // 1. check for OpenAI (User requested priority)
    if (process.env.OPENAI_API_KEY) {
        _cachedProvider = 'openai';
        console.log('[AI] Provider auto-detected: OpenAI');
        return 'openai';
    }

    // 2. check for Groq
    if (process.env.GROQ_API_KEY) {
        _cachedProvider = 'groq';
        console.log('[AI] Provider auto-detected: Groq (cloud)');
        return 'groq';
    }

    // 3. check for Ollama (local dev fallback)
    if (await isOllamaRunning()) {
        _cachedProvider = 'ollama';
        console.log('[AI] Provider auto-detected: Ollama (local)');
        return 'ollama';
    }

    // Default fallback
    _cachedProvider = 'groq';
    return 'groq';
}

// ============================================
// Completion Engine
// ============================================

async function callOllama(options: AiCompletionOptions): Promise<AiResponse> {
    const config = PROVIDERS.ollama;
    const start = Date.now();

    const body: any = {
        model: config.model,
        messages: options.messages,
        stream: false,
        options: {
            temperature: options.temperature ?? 0.7,
            num_predict: options.maxTokens ?? 512,
        },
    };

    if (options.jsonMode) {
        body.format = 'json';
    }

    const res = await fetch(`${config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Ollama Error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    return {
        text: data.message?.content || '',
        provider: 'ollama',
        model: config.model,
        latencyMs: Date.now() - start,
    };
}

async function callGroq(options: AiCompletionOptions): Promise<AiResponse> {
    const config = PROVIDERS.groq;
    const apiKey = process.env.GROQ_API_KEY;
    const start = Date.now();

    if (!apiKey) {
        throw new Error('GROQ_API_KEY is not set');
    }

    const body: any = {
        model: config.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 512,
    };

    if (options.jsonMode) {
        body.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Groq Error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    return {
        text: data.choices?.[0]?.message?.content || '',
        provider: 'groq',
        model: config.model,
        latencyMs: Date.now() - start,
    };
}

async function callOpenAI(options: AiCompletionOptions): Promise<AiResponse> {
    const config = PROVIDERS.openai;
    const apiKey = process.env.OPENAI_API_KEY;
    const start = Date.now();

    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not set');
    }

    const body: any = {
        model: config.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 512,
    };

    if (options.jsonMode) {
        body.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`OpenAI Error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    return {
        text: data.choices?.[0]?.message?.content || '',
        provider: 'openai',
        model: config.model,
        latencyMs: Date.now() - start,
    };
}

/**
 * Main entry point: Generate an AI completion using the best available provider.
 * Automatically falls back if primary provider fails.
 */
export async function generateCompletion(options: AiCompletionOptions): Promise<AiResponse> {
    const provider = await detectProvider();

    try {
        if (provider === 'openai') {
            return await callOpenAI(options);
        } else if (provider === 'ollama') {
            return await callOllama(options);
        } else {
            return await callGroq(options);
        }
    } catch (primaryError) {
        console.error(`[AI] Primary provider (${provider}) failed:`, primaryError);

        // Fallback: if Ollama failed, try Groq and vice versa
        try {
            if (provider === 'ollama' && process.env.GROQ_API_KEY) {
                console.log('[AI] Falling back to Groq...');
                return await callGroq(options);
            } else if (provider === 'groq') {
                console.log('[AI] Falling back to Ollama...');
                return await callOllama(options);
            }
        } catch (fallbackError) {
            console.error('[AI] Fallback provider also failed:', fallbackError);
        }

        throw primaryError;
    }
}

/**
 * Health check: returns current provider info
 */
export async function getAiHealth() {
    const provider = await detectProvider();
    const config = PROVIDERS[provider];
    return {
        provider,
        model: config.model,
        baseUrl: config.baseUrl,
        status: 'ready',
    };
}
