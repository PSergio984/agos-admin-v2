import { useEffect, useState } from "react";
import { notificationLogAPI } from "../../lib/api/notificationLog";
import type { NotificationAnalyticsResponse, ResponderNotificationSummary } from "../../types/notificationLog";
import ResponderSummaryCard from "./components/ResponderSummaryCard";
import DeliveryHistoryDrawer from "./components/DeliveryHistoryDrawer";
import {
    Search,
    Download,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Loader2,
} from "lucide-react";
import { exportToExcel, downloadExcelFile } from "../../lib/utils/export";
import { useToast } from "../../context/ToastContext";
import { useCoreHook } from "../../context/CoreContext";
import SelectSitePrompt from "../../components/common/SelectSitePrompt";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

export default function NotificationLogs() {
    const [responders, setResponders] = useState<ResponderNotificationSummary[]>([]);
    const [isFetching, setIsFetching] = useState(true);
    const [selectedResponder, setSelectedResponder] = useState<ResponderNotificationSummary | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [analytics, setAnalytics] = useState<NotificationAnalyticsResponse | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const { toastSuccess, toastError } = useToast();
    const { isAllSites } = useCoreHook();

    useEffect(() => {
        document.title = "Notification Logs - AGOS";
        return () => { document.title = "AGOS"; };
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setPage(1);
            setDebouncedSearch(searchQuery.trim());
        }, SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timeoutId);
    }, [searchQuery]);

    useEffect(() => {
        if (isAllSites) {
            setIsFetching(false);
            return;
        }
        const controller = new AbortController();

        const fetchResponders = async () => {
            setIsFetching(true);
            try {
                const data = await notificationLogAPI.getRespondersSummary(
                    page,
                    PAGE_SIZE,
                    debouncedSearch || undefined,
                    controller.signal,
                );
                if (controller.signal.aborted) return;

                if (data.total_pages > 0 && page > data.total_pages) {
                    setPage(data.total_pages);
                    return;
                }

                setResponders(data.items);
                setTotal(data.total);
                setTotalPages(data.total_pages);
                setHasMore(data.has_more);
            } catch {
                if (controller.signal.aborted) return;
                setResponders([]);
                setTotal(0);
                setTotalPages(0);
                setHasMore(false);
                toastError("Failed to load notification logs.");
            } finally {
                if (!controller.signal.aborted) setIsFetching(false);
            }
        };

        void fetchResponders();
        return () => controller.abort();
    }, [page, debouncedSearch, toastError, isAllSites]);

    useEffect(() => {
        if (isAllSites) return;
        const fetchAnalytics = async () => {
            try {
                setAnalytics(await notificationLogAPI.getAnalytics());
            } catch (error) {
                console.error("Failed to load notification analytics", error);
            }
        };

        void fetchAnalytics();
    }, [isAllSites]);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const data = await notificationLogAPI.exportDeliveries();
            if (data.length === 0) {
                toastError("No delivery data to export.");
                return;
            }
            const workbook = await exportToExcel(data, {
                sheetName: "Notification Deliveries",
                autoFilter: true,
                freezeHeader: true,
            });
            downloadExcelFile(workbook, "notification-logs-export.xlsx");
            toastSuccess("Export downloaded successfully.");
        } catch {
            toastError("Failed to export notification logs.");
        } finally {
            setIsExporting(false);
        }
    };

    const formatTime = (seconds: number | null) => {
        if (seconds === null) return "N/A";
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        return `${(seconds / 3600).toFixed(1)}h`;
    };

    const firstResult = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const lastResult = Math.min(page * PAGE_SIZE, total);
    const isSearchPending = searchQuery.trim() !== debouncedSearch;

    if (isAllSites) {
        return <SelectSitePrompt title="Select a site to view its notification logs." />;
    }

    return (
        <div className="flex flex-col flex-1 h-full overflow-hidden gap-2">
            {/* Analytics summary cards */}
            {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 shrink-0 overflow-y-auto max-h-[30rem] md:max-h-none md:overflow-visible pr-1 md:pr-0">
                    <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl px-5 py-4 flex items-center gap-4 flex-1 border border-white/50 dark:border-white/10 shadow-xl transition-all duration-300 hover:shadow-2xl">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Total Sent</p>
                            <p className="font-bold text-lg dark:text-slate-200">{analytics.total_sent}</p>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl px-5 py-4 flex items-center gap-4 flex-1 border border-white/50 dark:border-white/10 shadow-xl transition-all duration-300 hover:shadow-2xl">
                        <div className="w-9 h-9 rounded-lg bg-green-50 dark:bg-emerald-900/20 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-green-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Acknowledged</p>
                            <p className="font-bold text-lg dark:text-slate-200">{analytics.total_acknowledged} <span className="text-sm font-normal text-gray-400 dark:text-slate-500">({(analytics.acknowledgement_rate * 100).toFixed(1)}%)</span></p>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl px-5 py-4 flex items-center gap-4 flex-1 border border-white/50 dark:border-white/10 shadow-xl transition-all duration-300 hover:shadow-2xl">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Avg Response Time</p>
                            <p className="font-bold text-lg dark:text-slate-200">{formatTime(analytics.avg_response_time_seconds)}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative flex flex-1 overflow-hidden gap-2">
                {/* Left panel - Responder list */}
                <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl p-6 flex-1 h-full overflow-hidden min-w-0 flex flex-col border border-white/50 dark:border-white/10 shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="pl-2 border-l-4 font-semibold text-gray-600 dark:text-slate-300 border-primary dark:border-blue-500">
                            NOTIFICATION LOGS
                        </h2>
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary dark:text-blue-400 border border-primary/30 dark:border-blue-500/30 rounded-lg hover:bg-primary/5 dark:hover:bg-blue-500/10 disabled:opacity-50 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            {isExporting ? "Exporting..." : "Export"}
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative mb-4">
                        {isSearchPending || (isFetching && debouncedSearch) ? (
                            <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary dark:text-blue-400" />
                        ) : (
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                        )}
                        <input
                            type="text"
                            aria-label="Search notification logs by responder"
                            placeholder="Search by name or phone number..."
                            maxLength={120}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 text-sm bg-white/40 dark:bg-white/[0.02] text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 border border-gray-200/50 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-blue-500/20 focus:border-primary dark:focus:border-blue-500 transition-all duration-300"
                        />
                    </div>

                    {/* List */}
                    {isFetching ? (
                        <div className="flex-1 space-y-3 overflow-hidden">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="skeleton w-full h-24 rounded-lg" />
                            ))}
                        </div>
                    ) : responders.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                            {debouncedSearch
                                ? "No responders match your search."
                                : "No responders found."}
                        </div>
                    ) : (
                        <div className="custom-scrollbar space-y-2 overflow-auto flex-1 pr-1">
                            {responders.map((responder) => (
                                <ResponderSummaryCard
                                    key={responder.id}
                                    responder={responder}
                                    isSelected={selectedResponder?.id === responder.id}
                                    onClick={() => setSelectedResponder(responder)}
                                />
                            ))}
                        </div>
                    )}

                    {!isFetching && total > 0 && (
                        <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-200/60 pt-3 text-xs text-gray-500 dark:border-white/10 dark:text-slate-400">
                            <p>
                                Showing {firstResult}–{lastResult} of {total}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage((current) => current - 1)}
                                    disabled={page === 1 || isSearchPending}
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                                    aria-label="Previous responder page"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                    Previous
                                </button>
                                <span className="min-w-16 text-center font-medium text-gray-700 dark:text-slate-300">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPage((current) => current + 1)}
                                    disabled={!hasMore || isSearchPending}
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                                    aria-label="Next responder page"
                                >
                                    Next
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right panel - Delivery history drawer */}
                <DeliveryHistoryDrawer
                    responder={selectedResponder}
                    onClose={() => setSelectedResponder(null)}
                />
            </div>
        </div>
    );
}
