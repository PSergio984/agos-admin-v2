import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bell,
    CameraOff,
    Droplets,
    ShieldAlert,
    WifiOff,
    type LucideIcon,
} from "lucide-react";
import { useCoreHook } from "../../../../context/CoreContext";
import {
    WebSocketProvider,
    useWebSocket,
    useWebSocketMessage,
} from "../../../../context/WebSocketContext";
import { streamAPI } from "../../../../lib/api/stream";
import {
    capitalizeFirstLetter,
    getTimeAgo,
} from "../../../../lib/utils/formatter";
import type { LocationItem } from "../../../../types/location";
import type { CameraFrameSnapshot } from "../../../../types/stream";
import type {
    SensorData,
    SensorReadingSummaryResponse,
} from "../../../../types/sensor";
import type {
    FusionAnalysisData,
    FusionAnalysisSummaryResponse,
} from "../../../../types/fusionAnalysis";

export type WallMode = "frames" | "summary";

interface WallSiteTileProps {
    site: LocationItem;
    mode: WallMode;
}

// Alert-tier pill colors, same scale as the single-site FusionAnalysis card.
const TIER_CLASSES: Record<string, string> = {
    normal: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    warning:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};
const FALLBACK_TIER_CLASS =
    "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400";

/**
 * One tile on the all-sites wall. Mounting a scoped WebSocketProvider here
 * gives this subtree its own /ws?location_id=N socket, so the site's initial
 * payload and every live push land on this tile only — no cross-site writes.
 */
export default function WallSiteTile({ site, mode }: WallSiteTileProps) {
    return (
        <WebSocketProvider locationId={site.id}>
            <TileContent site={site} mode={mode} />
        </WebSocketProvider>
    );
}

function TileContent({ site, mode }: WallSiteTileProps) {
    const navigate = useNavigate();
    const { setViewScope } = useCoreHook();
    const { isConnected } = useWebSocket();

    const [frame, setFrame] = useState<CameraFrameSnapshot | null>(null);
    const [isFrameLoading, setIsFrameLoading] = useState(true);
    const [sensorData, setSensorData] = useState<SensorData | null>(null);
    const [isSensorLoading, setIsSensorLoading] = useState(true);
    const [fusionAnalysis, setFusionAnalysis] =
        useState<FusionAnalysisData | null>(null);
    const [isFusionLoading, setIsFusionLoading] = useState(true);

    // Seed the tile with the site's last received frame — the socket's
    // initial payload carries no camera_update, only live pushes after
    // connect. A 404 means no frame has ever arrived (placeholder shows).
    useEffect(() => {
        let cancelled = false;
        const fetchInitialFrame = async () => {
            try {
                const snapshot = await streamAPI.getLatestFrame(site.id);
                if (cancelled || !snapshot) return;
                // A live push may have beaten the REST response — keep
                // whichever frame arrived first.
                setFrame((prev) => prev ?? snapshot);
            } catch {
                // Non-404 failures leave the tile on its WS-driven state.
            } finally {
                if (!cancelled) setIsFrameLoading(false);
            }
        };
        void fetchInitialFrame();
        return () => {
            cancelled = true;
        };
    }, [site.id]);

    useWebSocketMessage<CameraFrameSnapshot>("camera_update", (data) => {
        setFrame(data);
        setIsFrameLoading(false);
    });

    useWebSocketMessage(
        "sensor_update",
        (data: SensorReadingSummaryResponse) => {
            setIsSensorLoading(false);
            // Error-status payloads carry a null sensor_reading.
            setSensorData(data.sensor_reading ?? null);
        },
    );

    useWebSocketMessage(
        "fusion_analysis_update",
        (data: FusionAnalysisSummaryResponse) => {
            setIsFusionLoading(false);
            setFusionAnalysis(data.fusion_analysis ?? null);
        },
    );

    const openSiteDashboard = () => {
        setViewScope(site.id);
        navigate("/dashboard");
    };

    const alertName = fusionAnalysis?.fusion_data?.alert_name;
    const tierClass = alertName
        ? (TIER_CLASSES[alertName.toLowerCase()] ?? FALLBACK_TIER_CLASS)
        : FALLBACK_TIER_CLASS;
    const waterLevel = sensorData?.water_level;

    return (
        <button
            type="button"
            onClick={openSiteDashboard}
            title={`Open the ${site.name} dashboard`}
            className="group w-full text-left bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/50 dark:border-white/10 shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-primary/40 dark:hover:border-blue-400/40 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
            {/* Camera frame */}
            <div className="relative aspect-video bg-black overflow-hidden">
                {isFrameLoading ? (
                    <div className="skeleton absolute inset-0"></div>
                ) : frame ? (
                    <img
                        src={`data:image/jpeg;base64,${frame.image}`}
                        alt={`${site.name} camera feed`}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
                        <CameraOff className="w-8 h-8" />
                        <p className="text-xs">No camera feed</p>
                    </div>
                )}

                {/* Site name overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 pointer-events-none">
                    <p className="text-white text-sm font-semibold truncate">
                        {site.name}
                    </p>
                    {frame && (
                        <p className="text-white/60 text-[0.65rem]">
                            Updated {getTimeAgo(frame.timestamp)}
                        </p>
                    )}
                </div>

                {/* Socket status badge */}
                <div className="absolute top-2 right-2 pointer-events-none">
                    {isConnected ? (
                        <span className="flex items-center gap-1.5 bg-black/50 rounded px-2 py-0.5 text-[0.65rem] font-semibold text-red-400">
                            <span className="bg-red-500 rounded-full w-1.5 h-1.5 animate-pulse"></span>
                            LIVE
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 bg-black/50 rounded px-2 py-0.5 text-[0.65rem] font-semibold text-amber-400">
                            <WifiOff className="w-3 h-3" />
                            OFFLINE
                        </span>
                    )}
                </div>
            </div>

            {/* Summary metrics */}
            {mode === "summary" && (
                <div className="p-3 md:p-4 flex flex-col gap-2 text-sm">
                    <MetricRow
                        icon={Droplets}
                        label="Water level"
                        isLoading={isSensorLoading}
                    >
                        {waterLevel
                            ? `${waterLevel.current_cm.toFixed(1)} cm · ${capitalizeFirstLetter(
                                  waterLevel.trend,
                              )}`
                            : "—"}
                    </MetricRow>
                    <MetricRow
                        icon={ShieldAlert}
                        label="Risk tier"
                        isLoading={isFusionLoading}
                    >
                        {alertName ? (
                            <span
                                className={`px-2 py-0.5 rounded-full text-[0.65rem] font-semibold uppercase tracking-wide ${tierClass}`}
                            >
                                {alertName}
                            </span>
                        ) : (
                            "—"
                        )}
                    </MetricRow>
                    <MetricRow icon={Bell} label="Alerts" isLoading={false}>
                        {/* No admin-callable per-site open/claimed alert
                            count endpoint exists yet — static dash until
                            the backend exposes one. */}
                        {"Open — · Claimed —"}
                    </MetricRow>
                </div>
            )}
        </button>
    );
}

function MetricRow({
    icon: Icon,
    label,
    isLoading,
    children,
}: {
    icon: LucideIcon;
    label: string;
    isLoading: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Icon className="w-3.5 h-3.5" />
                {label}
            </span>
            {isLoading ? (
                <div className="skeleton h-4 w-16 rounded"></div>
            ) : (
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {children}
                </span>
            )}
        </div>
    );
}
