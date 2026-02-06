import arcjet, { shield, detectBot, fixedWindow } from "@arcjet/next";

// Re-export as a singleton
const isArcjetConfigured = false;

export const aj = {
    protect: async () => {
        return {
            isDenied: () => false,
            reason: {
                isRateLimit: () => false,
                isBot: () => false
            }
        };
    }
} as any;
