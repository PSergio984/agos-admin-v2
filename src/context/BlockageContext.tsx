import {
    createContext,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import type { Status, ObstructionConfidence } from "../types/blockage";
import { useWebSocketMessage } from "./WebSocketContext";
import { useCoreHook } from "./CoreContext";
import { capitalizeFirstLetter } from "../lib/utils/formatter";
import type { BlockageSummaryResponse } from "../types/blockage";

interface WaterwayContextProps {
    status: Status | null;
    confidence: ObstructionConfidence | null;
    isFetching: boolean;
    warning: string | null;
    error: string | null;
}

const WaterwayContext = createContext<WaterwayContextProps | undefined>(
    undefined,
);

export function BlockageProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<Status | null>(null);
    const [confidence, setConfidence] = useState<ObstructionConfidence | null>(
        null,
    );
    const [isFetching, setIsFetching] = useState(true);
    const [warning, setWarning] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { locationDetails } = useCoreHook();

    // Blockage status is site-scoped — when the scope changes, reset
    // during render so the previous site's data is never painted.
    const [seenLocationId, setSeenLocationId] = useState(
        locationDetails.location_id,
    );
    if (seenLocationId !== locationDetails.location_id) {
        setSeenLocationId(locationDetails.location_id);
        setStatus(null);
        setConfidence(null);
        setIsFetching(true);
        setWarning(null);
        setError(null);
    }

    useWebSocketMessage(
        "blockage_detection_update",
        (data: BlockageSummaryResponse) => {
            setIsFetching(false);

            if (data.status === "error") {
                setError(data.message);
                setWarning(null);
                setStatus(null);
                setConfidence(null);
                return;
            }

            if (data.status === "warning") {
                setWarning(data.message);
                setError(null);
                setStatus(
                    capitalizeFirstLetter(data.blockage_status) as Status,
                );
                setConfidence(data.confidence ?? null);
                return;
            }

            setError(null);
            setWarning(null);
            setStatus(capitalizeFirstLetter(data.blockage_status) as Status);
            setConfidence(data.confidence ?? null);
        },
    );

    const contextValue = useMemo(
        () => ({
            status,
            confidence,
            isFetching,
            warning,
            error,
        }),
        [status, confidence, isFetching, warning, error],
    );

    return (
        <WaterwayContext.Provider value={contextValue}>
            {children}
        </WaterwayContext.Provider>
    );
}

export const useWaterwayContext = () => {
    const context = useContext(WaterwayContext);
    if (context === undefined) {
        throw new Error(
            "useWaterwayContext must be used within a BlockageProvider",
        );
    }
    return context;
};
