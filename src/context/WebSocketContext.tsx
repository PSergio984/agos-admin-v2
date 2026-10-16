import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import type { ReactNode } from "react";
import { useCoreHook } from "./CoreContext";

const websocketUrl = import.meta.env.VITE_API_WS_URL;

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

type WebSocketMessage = { type: string; data: unknown };

interface WSContextValue {
    isConnected: boolean;
    disconnectedSince: Date | null;
    subscribe: (type: string, callback: (data: unknown) => void) => () => void;
}

const WSContext = createContext<WSContextValue | undefined>(undefined);

export function WebSocketProvider({
    children,
    locationId: locationIdProp,
}: {
    children: ReactNode;
    locationId?: number;
}) {
    const socketRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [disconnectedSince, setDisconnectedSince] = useState<Date | null>(null);
    const coreContext = locationIdProp ? null : useCoreHook();
    const locationId = locationIdProp || coreContext?.locationDetails.location_id || 0;

    const mountedRef = useRef(true);
    const intentionalCloseRef = useRef(false);
    const retryCountRef = useRef(0);
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Latest location id, so a stable `connect` (and any pending reconnect)
    // always dials the current scope instead of a stale closure.
    const locationIdRef = useRef(locationId);
    locationIdRef.current = locationId;

    // Storage box that keeps track of event listeners for different message types
    const listenersRef = useRef<Map<string, Set<(data: unknown) => void>>>(
        new Map(),
    );

    const connect = useCallback(() => {
        const currentLocationId = locationIdRef.current;
        if (!currentLocationId || !mountedRef.current) return;

        if (socketRef.current) {
            const oldSocket = socketRef.current;
            socketRef.current = null;
            oldSocket.onclose = null;
            oldSocket.onerror = null;
            oldSocket.onmessage = null;
            oldSocket.close();
        }

        const ws = new WebSocket(
            `${websocketUrl}/ws?location_id=${currentLocationId}`,
        );
        socketRef.current = ws;

        ws.onopen = () => {
            if (import.meta.env.DEV) console.log("WebSocket connected");
            setIsConnected(true);
            setDisconnectedSince(null);
            retryCountRef.current = 0;
        };

        ws.onmessage = (e) => {
            try {
                const message: WebSocketMessage = JSON.parse(e.data);
                if (import.meta.env.DEV) console.log("Message received: ", message);

                // Call function subscribers for this message type
                const callbacks = listenersRef.current.get(message.type);
                if (callbacks) {
                    callbacks.forEach((callback) => callback(message.data));
                }
            } catch (error) {
                if (import.meta.env.DEV) console.error("Failed to parse WebSocket message:", error);
            }
        };

        ws.onclose = () => {
            if (import.meta.env.DEV) console.log("WebSocket disconnected");
            setIsConnected(false);
            setDisconnectedSince(new Date());

            if (!intentionalCloseRef.current && mountedRef.current) {
                const delay = Math.min(
                    BASE_BACKOFF_MS * 2 ** retryCountRef.current,
                    MAX_BACKOFF_MS,
                );
                if (import.meta.env.DEV) console.log(`Reconnecting in ${delay}ms...`);
                retryTimeoutRef.current = setTimeout(() => {
                    retryCountRef.current += 1;
                    connect();
                }, delay);
            }
        };

        ws.onerror = (error) => {
            if (import.meta.env.DEV) console.error("WebSocket error:", error);
        };
    }, []);

    // Re-run whenever the scoped location changes: the cleanup drops the old
    // socket, then connect() dials the new location. A falsy locationId
    // ("All sites" scope) simply stays disconnected.
    useEffect(() => {
        mountedRef.current = true;
        intentionalCloseRef.current = false;
        connect();

        return () => {
            mountedRef.current = false;
            intentionalCloseRef.current = true;
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
            const ws = socketRef.current;
            socketRef.current = null;
            if (ws) {
                ws.onclose = null;
                ws.close();
                setIsConnected(false);
                setDisconnectedSince(new Date());
            }
        };
    }, [connect, locationId]);

    // Function to subscribe to messages of a specific type
    // useCallback memoizes a function definition between component re-renders
    const subscribe = useCallback(
        (type: string, callback: (data: unknown) => void) => {
            // If no one is listening to this type yet, create a new set
            if (!listenersRef.current.has(type)) {
                listenersRef.current.set(type, new Set());
            }

            // Add the callback to the set of listeners for this type
            listenersRef.current.get(type)!.add(callback);

            // Return a cleanup function that will remove THIS specific callback
            // when the component unmounts (called by React's useEffect cleanup)
            return () => {
                const callbacks = listenersRef.current.get(type);
                if (callbacks) {
                    callbacks.delete(callback); // Remove the callback from the set

                    if (callbacks.size === 0) {
                        // If no more listeners, remove the set
                        listenersRef.current.delete(type);
                    }
                }
            };
        },
        [],
    );

    const contextValue = useMemo(
        () => ({
            isConnected,
            disconnectedSince,
            subscribe,
        }),
        [isConnected, disconnectedSince, subscribe],
    );

    return (
        <WSContext.Provider value={contextValue}>{children}</WSContext.Provider>
    );
}

// Custom hook to use the WebSocket context
export const useWebSocket = () => {
    const context = useContext(WSContext);
    if (context === undefined) {
        throw new Error("useWebSocket must be used within a WebSocketProvider");
    }
    return context;
};

// ===========================================
// Custom hook to listen for specific messages
// ===========================================
export function useWebSocketMessage<T = unknown>(
    messageType: string,
    onMessage: (data: T) => void,
) {
    // Get subscribe function from context
    const { subscribe } = useWebSocket();

    // Wrap onMessage in a ref so it doesn't trigger re-subscription
    const callbackRef = useRef(onMessage);

    // Keeps the ref updated
    useEffect(() => {
        callbackRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        const unsubscribe = subscribe(messageType, (data) => {
            callbackRef.current(data as T); // Call the latest onMessage
        });

        return unsubscribe; // Cleanup function on unmount
    }, [messageType, subscribe]);
}
