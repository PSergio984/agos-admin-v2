import {
    Cctv,
    ChevronDown,
    ChevronRight,
    Pencil,
    Plus,
    Power,
    PowerOff,
    Waves,
} from "lucide-react";

import type {
    CameraDeviceItem,
    DeviceKind,
    SensorDeviceItem,
} from "../../../types/devices";
import type { LocationItem } from "../../../types/location";
import { capitalizeFirstLetter } from "../../../lib/utils/formatter";
import { useSites } from "../context/SitesPageContext";

const ActiveBadge = ({ active }: { active: boolean }) => (
    <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
            active
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-slate-200 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
        }`}
    >
        {active ? "Active" : "Inactive"}
    </span>
);

interface DeviceTableProps {
    kind: DeviceKind;
    site: LocationItem;
    devices: (SensorDeviceItem | CameraDeviceItem)[];
}

function DeviceTable({ kind, site, devices }: DeviceTableProps) {
    const {
        openDeviceForm,
        setDevicePendingDeactivate,
        setDeviceActive,
    } = useSites();

    const isSensor = kind === "sensor";
    const title = isSensor ? "Sensor Devices" : "Camera Devices";
    const Icon = isSensor ? Waves : Cctv;

    return (
        <div>
            <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <Icon className="h-4 w-4" />
                    {title}
                </h3>
                {site.is_active && (
                    <button
                        type="button"
                        onClick={() => openDeviceForm(kind, site.id)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 dark:text-blue-400 dark:hover:bg-blue-500/10"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add
                    </button>
                )}
            </div>
            {devices.length === 0 ? (
                <p className="py-2 text-xs text-slate-500 dark:text-slate-400">
                    No {isSensor ? "sensor" : "camera"} devices registered for
                    this site.
                </p>
            ) : (
                <div className="custom-scrollbar overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">
                                    {isSensor ? "Config" : "Stream URL"}
                                </th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {devices.map((device) => (
                                <tr
                                    key={device.id}
                                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                                >
                                    <td className="py-2 pr-4 font-medium text-slate-900 dark:text-slate-100">
                                        {device.device_name}
                                    </td>
                                    <td className="py-2 pr-4 text-xs text-slate-500 dark:text-slate-400">
                                        {isSensor ? (
                                            (() => {
                                                const config = (
                                                    device as SensorDeviceItem
                                                ).sensor_config;
                                                return `Height ${config.installation_height} cm · Warning ${config.warning_threshold} cm · Critical ${config.critical_threshold} cm`;
                                            })()
                                        ) : (
                                            <span className="block max-w-[16rem] truncate">
                                                {(
                                                    device as CameraDeviceItem
                                                ).stream_url || "—"}
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-2 pr-4">
                                        <ActiveBadge
                                            active={device.is_active}
                                        />
                                    </td>
                                    <td className="py-2 pr-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openDeviceForm(
                                                        kind,
                                                        device.location_id,
                                                        device,
                                                    )
                                                }
                                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                title="Edit"
                                                aria-label={`Edit ${device.device_name}`}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            {device.is_active ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDevicePendingDeactivate(
                                                            { kind, device },
                                                        )
                                                    }
                                                    className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                    title="Deactivate"
                                                    aria-label={`Deactivate ${device.device_name}`}
                                                >
                                                    <PowerOff className="h-4 w-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void setDeviceActive(
                                                            kind,
                                                            device,
                                                            true,
                                                        )
                                                    }
                                                    className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                                    title="Reactivate"
                                                    aria-label={`Reactivate ${device.device_name}`}
                                                >
                                                    <Power className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function SiteRow({ site }: { site: LocationItem }) {
    const {
        expandedSiteId,
        toggleSite,
        siteDetails,
        respondersForSite,
        openSiteForm,
        setSitePendingDeactivate,
        setSiteActive,
    } = useSites();

    const expanded = expandedSiteId === site.id;
    const details = siteDetails[site.id];
    const siteResponders = expanded ? respondersForSite(site.id) : [];

    return (
        <li>
            <div className="flex items-center gap-2 py-3">
                <button
                    type="button"
                    onClick={() => toggleSite(site.id)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                    aria-expanded={expanded}
                    aria-label={`${expanded ? "Collapse" : "Expand"} ${site.name}`}
                    title={expanded ? "Collapse" : "Expand"}
                >
                    {expanded ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                </button>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                            {site.name}
                        </span>
                        {!site.is_active && <ActiveBadge active={false} />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {site.latitude.toFixed(5)}, {site.longitude.toFixed(5)}
                    </p>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => openSiteForm(site)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Edit"
                        aria-label={`Edit ${site.name}`}
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    {site.is_active ? (
                        <button
                            type="button"
                            onClick={() => setSitePendingDeactivate(site)}
                            className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                            title="Deactivate"
                            aria-label={`Deactivate ${site.name}`}
                        >
                            <PowerOff className="h-4 w-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => void setSiteActive(site, true)}
                            className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                            title="Reactivate"
                            aria-label={`Reactivate ${site.name}`}
                        >
                            <Power className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {expanded && (
                <div className="mb-4 ml-9 space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700/60 dark:bg-slate-800/30">
                    {details?.isLoading || !details ? (
                        <div className="space-y-2 py-2">
                            <div className="skeleton h-6 w-full rounded-md" />
                            <div className="skeleton h-6 w-2/3 rounded-md" />
                        </div>
                    ) : (
                        <>
                            <DeviceTable
                                kind="sensor"
                                site={site}
                                devices={details.sensors}
                            />
                            <DeviceTable
                                kind="camera"
                                site={site}
                                devices={details.cameras}
                            />
                        </>
                    )}

                    <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Responders
                        </h3>
                        {siteResponders.length === 0 ? (
                            <p className="py-1 text-xs text-slate-500 dark:text-slate-400">
                                No responders assigned to this site.
                            </p>
                        ) : (
                            <ul className="flex flex-wrap gap-2">
                                {siteResponders.map((responder) => (
                                    <li
                                        key={responder.id}
                                        className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs dark:border-slate-700"
                                    >
                                        <span className="font-medium text-slate-700 dark:text-slate-200">
                                            {responder.first_name}{" "}
                                            {responder.last_name}
                                        </span>
                                        <span className="text-slate-400 dark:text-slate-500">
                                            {capitalizeFirstLetter(
                                                responder.status,
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </li>
    );
}
