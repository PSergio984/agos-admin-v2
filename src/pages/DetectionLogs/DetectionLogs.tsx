import { useEffect, useRef, useState } from "react";
import { modelReadingLogAPI } from "../../lib/api/modelReadingLog";
import type { BlockageStatus, ModelReadingListItem } from "../../types/modelReadingLog";
import ReadingListItem from "./components/ReadingListItem";
import ReadingDetailModal from "./components/ReadingDetailModal";
import SelectSitePrompt from "../../components/common/SelectSitePrompt";
import { useCoreHook } from "../../context/CoreContext";

const STATUS_FILTERS: { label: string; value: BlockageStatus | "all" }[] = [
    { label: "All", value: "all" },
    { label: "Clear", value: "clear" },
    { label: "Possible", value: "partial" },
    { label: "Potential", value: "blocked" },
];

export default function DetectionLogs() {
    const { cameraDeviceDetails, isAllSites } = useCoreHook();
    const [readings, setReadings] = useState<ModelReadingListItem[]>([]);
    const [isFetching, setIsFetching] = useState(true);
    const [selectedReading, setSelectedReading] = useState<ModelReadingListItem | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [statusFilter, setStatusFilter] = useState<BlockageStatus | "all">("all");
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        document.title = "Detection Logs - AGOS";
        return () => {
            document.title = "AGOS";
        };
    }, []);

    const deviceId = cameraDeviceDetails.camera_device_id;

    useEffect(() => {
        if (!deviceId) {
            setReadings([]);
            setHasMore(false);
            setIsFetching(false);
            setSelectedReading(null);
            return;
        }

        const fetchReadings = async () => {
            setIsFetching(true);
            setPage(1);
            try {
                const res = await modelReadingLogAPI.getPaginated(
                    1,
                    10,
                    deviceId,
                    statusFilter === "all" ? undefined : statusFilter,
                );
                setReadings(res.items);
                setHasMore(res.has_more);
            } catch (error) {
                console.error(error);
            } finally {
                setIsFetching(false);
            }
        };

        fetchReadings();
    }, [deviceId, statusFilter]);

    const loadMore = async () => {
        if (!deviceId || isLoadingMore) return;

        const nextPage = page + 1;
        setIsLoadingMore(true);
        try {
            const res = await modelReadingLogAPI.getPaginated(
                nextPage,
                10,
                deviceId,
                statusFilter === "all" ? undefined : statusFilter,
            );
            setReadings((prev) => [...prev, ...res.items]);
            setHasMore(res.has_more);
            setPage(nextPage);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
                    loadMore();
                }
            },
            { threshold: 0.1 },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, isLoadingMore]);

    if (isAllSites) {
        return <SelectSitePrompt title="Select a site to view its detection logs." />;
    }

    return (
        <div className="flex flex-1 h-full overflow-hidden">
            <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl p-6 flex-1 h-full overflow-auto min-w-0 flex flex-col border border-white/50 dark:border-white/10 shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="pl-2 border-l-4 font-semibold text-gray-600 dark:text-slate-300 border-primary dark:border-blue-500">
                        DETECTION LOGS
                    </h2>
                </div>

                {/* Status filter chips */}
                <div className="flex gap-2 mb-4 overflow-x-auto whitespace-nowrap pb-1">
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setStatusFilter(f.value)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 uppercase tracking-widest ${
                                statusFilter === f.value
                                    ? "bg-primary dark:bg-blue-600 text-white shadow-lg scale-105"
                                    : "bg-white/40 dark:bg-white/5 text-gray-600 dark:text-slate-400 border border-gray-200/50 dark:border-white/5 hover:bg-white/60 dark:hover:bg-white/10"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* List */}
                {isFetching ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="skeleton w-full h-20 rounded-lg" />
                        ))}
                    </div>
                ) : readings.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-slate-500 text-center py-8">
                        No detection readings found.
                    </div>
                ) : (
                    <div className="space-y-2 overflow-auto flex-1">
                        {readings.map((reading) => (
                            <ReadingListItem
                                key={reading.id}
                                reading={reading}
                                isSelected={selectedReading?.id === reading.id}
                                onClick={() => setSelectedReading(reading)}
                            />
                        ))}

                        <div ref={sentinelRef} className="py-2 flex justify-center">
                            {isLoadingMore && (
                                <div className="spinner w-5 h-5 border-primary dark:border-blue-400 border-t-transparent" />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Detail modal */}
            {selectedReading && (
                <ReadingDetailModal
                    reading={selectedReading}
                    onClose={() => setSelectedReading(null)}
                />
            )}
        </div>
    );
}
