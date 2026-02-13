/**
 * Kitchen-Link Event Emitter
 * 
 * Simple in-memory pub/sub for real-time updates.
 * In a production multi-server environment, this would be backed by Redis.
 */

type Listener = (data: any) => void;
const listeners = new Set<Listener>();

export const eventEmitter = {
    /**
     * Subscribe to order updates.
     * @returns Unsubscribe function
     */
    subscribe(callback: Listener) {
        listeners.add(callback);
        return () => {
            listeners.delete(callback);
        };
    },

    /**
     * Emit an event to all connected listeners.
     */
    emit(event: string, payload: any) {
        const message = JSON.stringify({ event, payload, timestamp: Date.now() });
        listeners.forEach(listener => listener(message));
    }
};
