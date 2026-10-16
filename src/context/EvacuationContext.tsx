import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import type {
    EvacuationEvent,
    EvacuationKind,
    EvacuationRecommendation,
    PublicAlertPayload,
} from "../types/evacuation";
import { evacuationAPI } from "../lib/api/evacuation";
import { useWebSocketMessage } from "./WebSocketContext";
import { useCoreHook } from "./CoreContext";

interface EvacuationContextValue {
    /** Active, admin-facing recommendation (advisory — NOT a public blast). */
    recommendation: EvacuationRecommendation | null;
    /** Most recent public alert observed over WS (evacuate / all_clear). */
    lastPublicAlert: PublicAlertPayload | null;
    isDispatching: boolean;
    /** Human gate: authorize a public evacuate / all-clear blast. */
    confirm: (kind: EvacuationKind, message?: string) => Promise<EvacuationEvent>;
    /** Clear the current recommendation prompt without dispatching. */
    dismiss: () => void;
}

const EvacuationContext = createContext<EvacuationContextValue | undefined>(
    undefined,
);

export function EvacuationProvider({ children }: { children: ReactNode }) {
    const { locationDetails } = useCoreHook();
    const [recommendation, setRecommendation] =
        useState<EvacuationRecommendation | null>(null);
    const [lastPublicAlert, setLastPublicAlert] =
        useState<PublicAlertPayload | null>(null);
    const [isDispatching, setIsDispatching] = useState(false);

    // Recommendations and public alerts are site-scoped — when the scope
    // changes, reset during render so the previous site's prompt is
    // never painted.
    const [seenLocationId, setSeenLocationId] = useState(
        locationDetails.location_id,
    );
    if (seenLocationId !== locationDetails.location_id) {
        setSeenLocationId(locationDetails.location_id);
        setRecommendation(null);
        setLastPublicAlert(null);
    }

    useWebSocketMessage<EvacuationRecommendation>(
        "evacuation_recommendation",
        (data) => setRecommendation(data),
    );

    // Once a public alert goes out (by any admin), clear the prompt.
    useWebSocketMessage<PublicAlertPayload>("public_alert", (data) => {
        setLastPublicAlert(data);
        setRecommendation(null);
    });

    const dismiss = useCallback(() => setRecommendation(null), []);

    const confirm = useCallback(
        async (kind: EvacuationKind, message?: string) => {
            setIsDispatching(true);
            try {
                const event = await evacuationAPI.confirm({
                    location_id: locationDetails.location_id,
                    kind,
                    message: message ?? null,
                    recommendation_id: recommendation?.recommendation_id ?? null,
                });
                setRecommendation(null);
                return event;
            } finally {
                setIsDispatching(false);
            }
        },
        [locationDetails.location_id, recommendation],
    );

    const value = useMemo(
        () => ({
            recommendation,
            lastPublicAlert,
            isDispatching,
            confirm,
            dismiss,
        }),
        [recommendation, lastPublicAlert, isDispatching, confirm, dismiss],
    );

    return (
        <EvacuationContext.Provider value={value}>
            {children}
        </EvacuationContext.Provider>
    );
}

export const useEvacuation = () => {
    const context = useContext(EvacuationContext);
    if (context === undefined) {
        throw new Error("useEvacuation must be used within an EvacuationProvider");
    }
    return context;
};
