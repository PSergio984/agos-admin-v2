import {
    createContext,
    useContext,
    useState,
    type ReactNode,
} from "react";
import { useWebSocketMessage } from "./WebSocketContext";
import { useCoreHook } from "./CoreContext";

interface CameraFrame {
    image: string;
    timestamp: string;
}

interface VideoContextValue {
    latestFrame: CameraFrame | null;
    isLoading: boolean;
}

const VideoContext = createContext<VideoContextValue | undefined>(undefined);

export function VideoProvider({ children }: { children: ReactNode }) {
    const [latestFrame, setLatestFrame] = useState<CameraFrame | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { locationDetails } = useCoreHook();

    // Camera frames are site-scoped — when the scope changes, reset
    // during render so the previous site's frame is never painted.
    const [seenLocationId, setSeenLocationId] = useState(
        locationDetails.location_id,
    );
    if (seenLocationId !== locationDetails.location_id) {
        setSeenLocationId(locationDetails.location_id);
        setLatestFrame(null);
        setIsLoading(true);
    }

    useWebSocketMessage<CameraFrame>("camera_update", (data) => {
        setLatestFrame(data);
        setIsLoading(false);
    });

    return (
        <VideoContext.Provider value={{ latestFrame, isLoading }}>
            {children}
        </VideoContext.Provider>
    );
}

export function useVideoContext() {
    const context = useContext(VideoContext);
    if (context === undefined) {
        throw new Error("useVideoContext must be used within a VideoProvider");
    }
    return context;
}
