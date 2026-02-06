import { prisma } from '@/lib/db';
import { getTenantFromRequest } from '@/lib/tenant';
import { isFeatureEnabled, Feature } from '@/lib/subscription';

export async function POST(req: Request) {
    try {
        // 1. Detect Tenant & Verify Feature Access
        const tenant = await getTenantFromRequest();
        if (!tenant) {
            return new Response(JSON.stringify({ error: "Hotel identity required" }), { status: 400 });
        }

        if (!isFeatureEnabled(tenant.plan as any, Feature.AI_CONCIERGE)) {
            return new Response(JSON.stringify({
                error: "Tier Upgrade Required",
                message: "The AI Concierge is available only on Premium plans."
            }), { status: 403 });
        }

        const { messages, guestName, tableCode } = await req.json();
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "Configuration Error: Missing GROQ_API_KEY" }), { status: 500 });
        }

        // 2. Context Injection: Fetch Menu (Tenant Isolated)
        const menuItems = await prisma.menuItem.findMany({
            where: {
                clientId: tenant.id,
                isAvailable: true
            },
            select: { id: true, name: true, category: { select: { name: true } }, description: true, price: true }
        });

        // 3. Construct Prompt
        const lastUserMessage = messages[messages.length - 1].content;

        const systemPrompt = `
You are the "Master Waiter" of HotelPro. Persona: Elite 5-star English Butler.
User: ${guestName || 'Guest'}. Table: ${tableCode || 'Unknown'}.

MENU:
${menuItems.map(i => `- ${i.name} (${i.price} INR)`).join('\n')}

RULES:
1. Be helpful, elegant, and concise.
2. If suggesting an item, end with: [UI:ITEM_CARD:item_id]
3. If checking status, end with: [UI:STATUS_TRACKER]
4. If finalizing order, end with: [UI:ORDER_SUMMARY]

User said: "${lastUserMessage}"
Respond as the waiter. Do not use JSON. Just speak.
`;

        // 3. Direct Call to Groq API (Ultra Fast)
        console.log("Sending request to Groq...");
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile", // The "Ferrari" Model
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: lastUserMessage }
                ],
                temperature: 0.7,
                max_tokens: 256
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("GROQ API FAILURE:", errorText);
            throw new Error(`Groq API Error: ${errorText}`);
        }

        const data = await response.json();
        const aiText = data.choices[0].message.content;

        return new Response(aiText);

    } catch (error: any) {
        console.error("Concierge Brain Error:", error);
        return new Response("I apologize sir, my thoughts are a bit scattered. Please verify my new Groq API key.", { status: 200 });
    }
}
