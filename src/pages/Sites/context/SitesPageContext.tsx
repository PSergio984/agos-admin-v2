import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import { useToast } from "../../../context/ToastContext";
import {
    cameraDevicesAPI,
    sensorDevicesAPI,
} from "../../../lib/api/devices";
import { locationsAPI } from "../../../lib/api/locations";
import { responderAPI } from "../../../lib/api/responder";
import type {
    CameraDeviceItem,
    DeviceKind,
    SensorDeviceItem,
} from "../../../types/devices";
import type { LocationItem } from "../../../types/location";
import type { ResponderListItem } from "../../../types/responder";

export interface SiteDetails {
    sensors: SensorDeviceItem[];
    cameras: CameraDeviceItem[];
    isLoading: boolean;
}

export interface DeviceFormState {
    kind: DeviceKind;
    siteId: number;
    // null => create
    device: SensorDeviceItem | CameraDeviceItem | null;
}

export interface DeviceDeactivateTarget {
    kind: DeviceKind;
    device: SensorDeviceItem | CameraDeviceItem;
}

interface SitesPageContextValue {
    filteredSites: LocationItem[];
    searchQuery: string;
    setSearchQuery: Dispatch<SetStateAction<string>>;
    isFetchingSites: boolean;

    expandedSiteId: number | null;
    toggleSite: (siteId: number) => void;
    siteDetails: Record<number, SiteDetails>;
    respondersForSite: (siteId: number) => ResponderListItem[];

    sites: LocationItem[];
    upsertSite: (site: LocationItem) => void;
    setSiteActive: (
        site: LocationItem,
        isActive: boolean,
    ) => Promise<boolean>;
    siteFormOpen: boolean;
    siteFormEditing: LocationItem | null;
    openSiteForm: (site?: LocationItem) => void;
    setSiteFormOpen: Dispatch<SetStateAction<boolean>>;
    sitePendingDeactivate: LocationItem | null;
    setSitePendingDeactivate: Dispatch<
        SetStateAction<LocationItem | null>
    >;

    deviceForm: DeviceFormState | null;
    openDeviceForm: (
        kind: DeviceKind,
        siteId: number,
        device?: SensorDeviceItem | CameraDeviceItem,
    ) => void;
    closeDeviceForm: () => void;
    upsertDevice: (
        kind: DeviceKind,
        device: SensorDeviceItem | CameraDeviceItem,
    ) => void;
    setDeviceActive: (
        kind: DeviceKind,
        device: SensorDeviceItem | CameraDeviceItem,
        isActive: boolean,
    ) => Promise<boolean>;
    devicePendingDeactivate: DeviceDeactivateTarget | null;
    setDevicePendingDeactivate: Dispatch<
        SetStateAction<DeviceDeactivateTarget | null>
    >;
}

const SitesPageContext = createContext<SitesPageContextValue | undefined>(
    undefined,
);

export function SitesPageProvider({ children }: { children: ReactNode }) {
    const { toastSuccess, toastError } = useToast();

    const [sites, setSites] = useState<LocationItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isFetchingSites, setIsFetchingSites] = useState<boolean>(true);

    const [expandedSiteId, setExpandedSiteId] = useState<number | null>(null);
    const [siteDetails, setSiteDetails] = useState<
        Record<number, SiteDetails>
    >({});
    const [responders, setResponders] = useState<ResponderListItem[]>([]);

    const [siteFormOpen, setSiteFormOpen] = useState<boolean>(false);
    const [siteFormEditing, setSiteFormEditing] = useState<LocationItem | null>(
        null,
    );
    const [sitePendingDeactivate, setSitePendingDeactivate] =
        useState<LocationItem | null>(null);

    const [deviceForm, setDeviceForm] = useState<DeviceFormState | null>(null);
    const [devicePendingDeactivate, setDevicePendingDeactivate] =
        useState<DeviceDeactivateTarget | null>(null);

    useEffect(() => {
        const fetchSites = async () => {
            try {
                setIsFetchingSites(true);
                // include_inactive: the registry manages retired sites too.
                const res = await locationsAPI.listSites(true);
                setSites(res);
            } catch {
                toastError("Failed to fetch sites");
            } finally {
                setIsFetchingSites(false);
            }
        };

        const fetchResponders = async () => {
            try {
                const res = await responderAPI.getAllResponders();
                setResponders(res);
            } catch {
                toastError("Failed to fetch responders");
            }
        };

        fetchSites();
        fetchResponders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredSites = useMemo(() => {
        if (!searchQuery.trim()) return sites;
        const q = searchQuery.toLowerCase();
        return sites.filter((s) => s.name.toLowerCase().includes(q));
    }, [sites, searchQuery]);

    const respondersForSite = useCallback(
        (siteId: number) => responders.filter((r) => r.location_id === siteId),
        [responders],
    );

    const toggleSite = useCallback(
        (siteId: number) => {
            setExpandedSiteId((prev) => (prev === siteId ? null : siteId));
            if (siteDetails[siteId]) return;

            setSiteDetails((prev) => ({
                ...prev,
                [siteId]: { sensors: [], cameras: [], isLoading: true },
            }));
            void (async () => {
                try {
                    const [sensors, cameras] = await Promise.all([
                        sensorDevicesAPI.list(siteId),
                        cameraDevicesAPI.list(siteId),
                    ]);
                    setSiteDetails((prev) => ({
                        ...prev,
                        [siteId]: { sensors, cameras, isLoading: false },
                    }));
                } catch {
                    toastError("Failed to load site devices");
                    setSiteDetails((prev) => ({
                        ...prev,
                        [siteId]: { sensors: [], cameras: [], isLoading: false },
                    }));
                }
            })();
        },
        [siteDetails, toastError],
    );

    const upsertSite = useCallback((saved: LocationItem) => {
        setSites((prev) => {
            const exists = prev.some((s) => s.id === saved.id);
            const next = exists
                ? prev.map((s) => (s.id === saved.id ? saved : s))
                : [...prev, saved];
            return next.sort((a, b) => a.name.localeCompare(b.name));
        });
    }, []);

    const setSiteActive = useCallback(
        async (site: LocationItem, isActive: boolean): Promise<boolean> => {
            try {
                const updated = await locationsAPI.updateSite(site.id, {
                    is_active: isActive,
                });
                upsertSite(updated);
                toastSuccess(
                    isActive
                        ? `Site "${updated.name}" reactivated`
                        : `Site "${updated.name}" deactivated`,
                );
                return true;
            } catch {
                toastError("Failed to update site");
                return false;
            }
        },
        [upsertSite, toastSuccess, toastError],
    );

    const openSiteForm = useCallback((site?: LocationItem) => {
        setSiteFormEditing(site ?? null);
        setSiteFormOpen(true);
    }, []);

    const upsertDevice = useCallback(
        (
            kind: DeviceKind,
            saved: SensorDeviceItem | CameraDeviceItem,
        ) => {
            setSiteDetails((prev) => {
                const next: Record<number, SiteDetails> = {};
                // Drop the device from every cached site first so a
                // location_id re-assignment moves it instead of duplicating it.
                for (const [key, detail] of Object.entries(prev)) {
                    next[Number(key)] = {
                        ...detail,
                        sensors: detail.sensors.filter(
                            (d) => !(kind === "sensor" && d.id === saved.id),
                        ),
                        cameras: detail.cameras.filter(
                            (d) => !(kind === "camera" && d.id === saved.id),
                        ),
                    };
                }
                // Only merge into a site whose devices were already fetched;
                // an unfetched site pulls fresh data on expand anyway.
                const target = next[saved.location_id];
                if (target) {
                    next[saved.location_id] =
                        kind === "sensor"
                            ? {
                                  ...target,
                                  sensors: [
                                      ...target.sensors,
                                      saved as SensorDeviceItem,
                                  ],
                              }
                            : {
                                  ...target,
                                  cameras: [
                                      ...target.cameras,
                                      saved as CameraDeviceItem,
                                  ],
                              };
                }
                return next;
            });
        },
        [],
    );

    const setDeviceActive = useCallback(
        async (
            kind: DeviceKind,
            device: SensorDeviceItem | CameraDeviceItem,
            isActive: boolean,
        ): Promise<boolean> => {
            try {
                const updated =
                    kind === "sensor"
                        ? await sensorDevicesAPI.update(device.id, {
                              is_active: isActive,
                          })
                        : await cameraDevicesAPI.update(device.id, {
                              is_active: isActive,
                          });
                upsertDevice(kind, updated);
                toastSuccess(
                    isActive
                        ? `Device "${updated.device_name}" reactivated`
                        : `Device "${updated.device_name}" deactivated`,
                );
                return true;
            } catch {
                toastError("Failed to update device");
                return false;
            }
        },
        [upsertDevice, toastSuccess, toastError],
    );

    const openDeviceForm = useCallback(
        (
            kind: DeviceKind,
            siteId: number,
            device?: SensorDeviceItem | CameraDeviceItem,
        ) => {
            setDeviceForm({ kind, siteId, device: device ?? null });
        },
        [],
    );

    const closeDeviceForm = useCallback(() => setDeviceForm(null), []);

    const contextValue = useMemo(
        () => ({
            filteredSites,
            searchQuery,
            setSearchQuery,
            isFetchingSites,
            expandedSiteId,
            toggleSite,
            siteDetails,
            respondersForSite,
            sites,
            upsertSite,
            setSiteActive,
            siteFormOpen,
            siteFormEditing,
            openSiteForm,
            setSiteFormOpen,
            sitePendingDeactivate,
            setSitePendingDeactivate,
            deviceForm,
            openDeviceForm,
            closeDeviceForm,
            upsertDevice,
            setDeviceActive,
            devicePendingDeactivate,
            setDevicePendingDeactivate,
        }),
        [
            filteredSites,
            searchQuery,
            isFetchingSites,
            expandedSiteId,
            toggleSite,
            siteDetails,
            respondersForSite,
            sites,
            upsertSite,
            setSiteActive,
            siteFormOpen,
            siteFormEditing,
            openSiteForm,
            sitePendingDeactivate,
            deviceForm,
            openDeviceForm,
            closeDeviceForm,
            upsertDevice,
            setDeviceActive,
            devicePendingDeactivate,
        ],
    );

    return (
        <SitesPageContext.Provider value={contextValue}>
            {children}
        </SitesPageContext.Provider>
    );
}

export const useSites = () => {
    const context = useContext(SitesPageContext);
    if (context === undefined) {
        throw new Error("useSites must be used within a SitesPageProvider");
    }
    return context;
};
