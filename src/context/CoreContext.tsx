import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import ExcelJS from "exceljs";
import { useToast } from "./ToastContext";
import { downloadExcelFile, exportToExcel } from "../lib/utils/export";
import { coreAPI } from "../lib/api/core";
import { locationsAPI } from "../lib/api/locations";
import type { SensorReadingForExportResponse } from "../types/sensor";
import type {
    LocationDetails,
    SensorDeviceDetails,
    CameraDeviceDetails,
} from "../types/core";
import type { LocationItem } from "../types/location";
import { sensorAPI } from "../lib/api/sensor";

export type ViewScope = "all" | number;

const STORAGE_KEYS = {
    LOCATION: "core_location",
    SENSOR_DEVICE: "core_sensor_device",
    CAMERA_DEVICE: "core_camera_device",
    VIEW_SCOPE: "core_view_scope",
} as const;

const ALL_SITES_LOCATION: LocationDetails = {
    location_id: 0,
    location_name: "All sites",
};
const NO_SENSOR_DEVICE: SensorDeviceDetails = {
    sensor_device_id: 0,
    sensor_device_name: "",
};
const NO_CAMERA_DEVICE: CameraDeviceDetails = {
    camera_device_id: 0,
    camera_device_name: "",
};

const getObjectFromStorage = <T,>(key: string): T | null => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
};
const setObjectToStorage = (key: string, value: object): void =>
    localStorage.setItem(key, JSON.stringify(value));

const getViewScopeFromStorage = (): ViewScope | null => {
    const stored = localStorage.getItem(STORAGE_KEYS.VIEW_SCOPE);
    if (stored === null) return null;
    const parsed: unknown = JSON.parse(stored);
    if (parsed === "all") return "all";
    return typeof parsed === "number" ? parsed : null;
};
const setViewScopeToStorage = (scope: ViewScope): void =>
    localStorage.setItem(STORAGE_KEYS.VIEW_SCOPE, JSON.stringify(scope));

const sensor_readings_export_columns = [
    {
        header: "Water Level (cm)",
        key: "water_level_cm",
        width: 20,
    },
    {
        header: "Change Rate (cm)",
        key: "change_rate",
        width: 18,
    },
    { header: "Status", key: "status", width: 15 },
    {
        header: "Signal Strength",
        key: "signal_strength",
        width: 20,
    },
    {
        header: "Signal Quality",
        key: "signal_quality",
        width: 20,
    },
    { header: "Timestamp", key: "timestamp", width: 30 },
];

interface CoreContextValue {
    locationDetails: LocationDetails;
    sensorDeviceDetails: SensorDeviceDetails;
    cameraDeviceDetails: CameraDeviceDetails;
    sites: LocationItem[];
    /** `null` only until the sites list resolves the initial scope. */
    viewScope: ViewScope | null;
    setViewScope: (scope: ViewScope) => void;
    isAllSites: boolean;
    isExportingToExcel: boolean;
    exportSensorReadingsToExcel: (
        startDate: string,
        endDate: string,
    ) => Promise<void>;
}

const CoreContext = createContext<CoreContextValue | undefined>(undefined);

export function CoreProvider({ children }: { children: React.ReactNode }) {
    const [coreError, setCoreError] = useState<string | null>(null);
    const [sites, setSites] = useState<LocationItem[]>([]);
    const [viewScope, setViewScopeState] = useState<ViewScope | null>(
        () => getViewScopeFromStorage(),
    );
    const [cachedLocation] = useState<LocationDetails | null>(() =>
        getObjectFromStorage<LocationDetails>(STORAGE_KEYS.LOCATION),
    );
    const [sensorDeviceDetails, setSensorDeviceDetails] =
        useState<SensorDeviceDetails>(() =>
            getViewScopeFromStorage() === "all"
                ? NO_SENSOR_DEVICE
                : (getObjectFromStorage<SensorDeviceDetails>(
                      STORAGE_KEYS.SENSOR_DEVICE,
                  ) ?? NO_SENSOR_DEVICE),
        );
    const [cameraDeviceDetails, setCameraDeviceDetails] =
        useState<CameraDeviceDetails>(() =>
            getViewScopeFromStorage() === "all"
                ? NO_CAMERA_DEVICE
                : (getObjectFromStorage<CameraDeviceDetails>(
                      STORAGE_KEYS.CAMERA_DEVICE,
                  ) ?? NO_CAMERA_DEVICE),
        );

    const [exportingToExcelInProgress, setExportingToExcelInProgress] =
        useState<{ mainMessage: string; subMessage: string }>({
            mainMessage: "",
            subMessage: "",
        });

    const { toastError } = useToast();

    // Fetch the sites registry once, then resolve the initial scope:
    // a stored scope that still exists wins, otherwise the first active
    // site (same landing spot as the old single-site behavior).
    useEffect(() => {
        const fetchSites = async () => {
            try {
                const res = await locationsAPI.listSites();
                setSites(res);
                setViewScopeState((prev) => {
                    if (
                        prev !== null &&
                        (prev === "all" || res.some((s) => s.id === prev))
                    ) {
                        return prev;
                    }
                    return res.find((s) => s.is_active)?.id ?? "all";
                });
            } catch {
                setCoreError(
                    "Failed to load system configuration. Please refresh the page.",
                );
            }
        };

        fetchSites();
    }, []);

    const setViewScope = useCallback((scope: ViewScope) => {
        setViewScopeState(scope);
    }, []);

    // Persist the resolved scope so reloads land on the same view.
    useEffect(() => {
        if (viewScope !== null) {
            setViewScopeToStorage(viewScope);
        }
    }, [viewScope]);

    // The site under scope, or the "all sites" sentinel. While the initial
    // scope is still resolving, fall back to the last cached location so
    // returning users keep their previous view instead of a flash.
    const locationDetails = useMemo<LocationDetails>(() => {
        if (viewScope === "all") return ALL_SITES_LOCATION;
        if (typeof viewScope === "number") {
            const site = sites.find((s) => s.id === viewScope);
            if (site) {
                return { location_id: site.id, location_name: site.name };
            }
        }
        return cachedLocation ?? { location_id: 0, location_name: "" };
    }, [viewScope, sites, cachedLocation]);

    useEffect(() => {
        setObjectToStorage(STORAGE_KEYS.LOCATION, locationDetails);
    }, [locationDetails]);

    // Device details follow the selected site. A site with no provisioned
    // devices (404 from /core/device-details) falls back to the zero-id
    // sentinels so consumers stop firing requests.
    const keepCachedDevicesRef = useRef(true);
    useEffect(() => {
        if (viewScope === null) return;
        if (viewScope === "all") {
            setSensorDeviceDetails(NO_SENSOR_DEVICE);
            setCameraDeviceDetails(NO_CAMERA_DEVICE);
            return;
        }

        // On site switches, clear the previous site's ids before refetching
        // so consumers never render site-A values under site B. The first
        // resolution keeps the cached ids instead (no reload flash).
        const keepCached = keepCachedDevicesRef.current;
        keepCachedDevicesRef.current = false;
        if (!keepCached) {
            setSensorDeviceDetails(NO_SENSOR_DEVICE);
            setCameraDeviceDetails(NO_CAMERA_DEVICE);
        }

        let cancelled = false;
        const fetchDeviceDetails = async () => {
            try {
                const res = await coreAPI.getDeviceDetails(viewScope);
                if (cancelled) return;
                const sensor: SensorDeviceDetails = {
                    sensor_device_id: res.sensor_device_id,
                    sensor_device_name: res.sensor_device_name,
                };
                const camera: CameraDeviceDetails = {
                    camera_device_id: res.camera_device_id,
                    camera_device_name: res.camera_device_name,
                };
                setSensorDeviceDetails(sensor);
                setCameraDeviceDetails(camera);
                setObjectToStorage(STORAGE_KEYS.SENSOR_DEVICE, sensor);
                setObjectToStorage(STORAGE_KEYS.CAMERA_DEVICE, camera);
            } catch {
                if (cancelled) return;
                setSensorDeviceDetails(NO_SENSOR_DEVICE);
                setCameraDeviceDetails(NO_CAMERA_DEVICE);
            }
        };
        void fetchDeviceDetails();
        return () => {
            cancelled = true;
        };
    }, [viewScope]);

    const exportSensorReadingsToExcel = async (
        startDateTime: string,
        endDateTime: string,
    ) => {
        try {
            setExportingToExcelInProgress({
                mainMessage: "Fetching sensor readings...",
                subMessage: "",
            });
            const res: SensorReadingForExportResponse =
                await sensorAPI.getSensorReadingsForExport(
                    startDateTime,
                    endDateTime,
                    sensorDeviceDetails.sensor_device_id,
                );

            setExportingToExcelInProgress({
                mainMessage: "Generating Excel file...",
                subMessage: `Processing ${res.readings.length.toLocaleString()} rows`,
            });
            const workBook: ExcelJS.Workbook = await exportToExcel(
                res.readings,
                { columns: sensor_readings_export_columns },
            );

            setExportingToExcelInProgress({
                mainMessage: "Downloading Excel file...",
                subMessage: `Processing ${res.readings.length.toLocaleString()} rows`,
            });
            downloadExcelFile(
                workBook,
                `${sensorDeviceDetails.sensor_device_name}_Readings_${startDateTime}_to_${endDateTime}.xlsx`,
            );
        } catch {
            toastError("Failed to export sensor readings");
        } finally {
            setExportingToExcelInProgress({ mainMessage: "", subMessage: "" });
        }
    };

    const contextValue = useMemo(
        () => ({
            locationDetails,
            sensorDeviceDetails,
            cameraDeviceDetails,
            sites,
            viewScope,
            setViewScope,
            isAllSites: viewScope === "all",
            isExportingToExcel: exportingToExcelInProgress.mainMessage !== "",
            exportSensorReadingsToExcel,
        }),
        [
            locationDetails,
            sensorDeviceDetails,
            cameraDeviceDetails,
            sites,
            viewScope,
            setViewScope,
            exportingToExcelInProgress,
        ],
    );

    if (coreError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 p-8">
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">Unable to Connect</h2>
                    <p className="text-sm text-gray-500 mb-4">{coreError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:opacity-90 transition-opacity"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <CoreContext.Provider value={contextValue}>
            {children}

            {/* Toast for Excel export progress */}
            {exportingToExcelInProgress.mainMessage && (
                <div className="fixed right-10 bottom-10 pl-5 py-4 pr-16 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-2 border-gray-200 dark:border-white/10 custom-shadow dark:shadow-black/50 rounded-lg z-[50] flex items-center gap-5 text-slate-900 dark:text-slate-100">
                    <div className="spinner w-5 h-5 text-emerald-600 dark:text-emerald-400"></div>
                    <div className="flex flex-col gap-1">
                        <p className="font-medium text-sm">
                            {exportingToExcelInProgress.mainMessage}
                        </p>
                        {exportingToExcelInProgress.subMessage && (
                            <p className="text-gray-600 dark:text-slate-400 text-xs">
                                {exportingToExcelInProgress.subMessage}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </CoreContext.Provider>
    );
}

export const useCoreHook = () => {
    const context = useContext(CoreContext);
    if (context === undefined) {
        throw new Error("useCoreHook must be used within a CoreProvider");
    }
    return context;
};
