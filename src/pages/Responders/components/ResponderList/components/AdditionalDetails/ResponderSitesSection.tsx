import { useEffect, useState } from "react";
import axios from "axios";
import { MapPin, Navigation, Plus, Truck, X } from "lucide-react";
import type {
    ResponderAllDetails,
    ResponderDeploymentCreateRequest,
    ResponderDeploymentsResponse,
} from "../../../../../../types/responder";
import type { LocationItem } from "../../../../../../types/location";
import { responderAPI } from "../../../../../../lib/api/responder";
import { locationsAPI } from "../../../../../../lib/api/locations";
import { useResponders } from "../../../../context/RespondersPageContext";
import { useResponderList } from "../../context/ResponderListContext";
import { useToast } from "../../../../../../context/ToastContext";
import { formatTimestamp } from "../../../../../../lib/utils/formatter";

const apiErrorMessage = (error: unknown, fallback: string): string =>
    axios.isAxiosError(error) &&
    typeof error.response?.data?.detail === "string"
        ? error.response.data.detail
        : fallback;

const selectClass =
    "w-full bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/5 text-gray-900 dark:text-slate-200 text-sm font-medium rounded-xl focus:ring-primary focus:border-primary block p-2.5 outline-none cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

const SectionHeader = ({
    icon,
    title,
    className = "mb-2",
}: {
    icon: React.ReactNode;
    title: string;
    className?: string;
}) => (
    <div
        className={`${className} flex items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-slate-400`}
    >
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
            {icon}
        </div>
        <span>{title}</span>
    </div>
);

export default function ResponderSitesSection({
    responder,
}: {
    responder: ResponderAllDetails;
}) {
    const { setCache } = useResponders();
    const { addResponderToCache } = useResponderList();
    const { toastSuccess, toastError } = useToast();

    const [membership, setMembership] =
        useState<ResponderDeploymentsResponse | null>(null);
    const [sites, setSites] = useState<LocationItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);

    const [isSavingHome, setIsSavingHome] = useState(false);
    const [isSavingPresence, setIsSavingPresence] = useState(false);
    const [closingDeploymentId, setClosingDeploymentId] = useState<
        number | null
    >(null);

    const [addFormOpen, setAddFormOpen] = useState(false);
    const [newSiteId, setNewSiteId] = useState("");
    const [newStartsAt, setNewStartsAt] = useState("");
    const [newPlannedEndsAt, setNewPlannedEndsAt] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const refreshMembership = async () => {
        const res = await responderAPI.getDeployments(responder.id);
        setMembership(res);
    };

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setLoadFailed(false);
            try {
                const [deployments, siteList] = await Promise.all([
                    responderAPI.getDeployments(responder.id),
                    locationsAPI.listSites(),
                ]);
                if (cancelled) return;
                setMembership(deployments);
                setSites(siteList);
            } catch (error) {
                if (!cancelled) {
                    setLoadFailed(true);
                    console.log(error);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [responder.id]);

    const handleHomeSiteChange = async (
        e: React.ChangeEvent<HTMLSelectElement>,
    ) => {
        const nextId = Number(e.target.value);
        if (!membership || nextId === membership.home_location_id) return;

        setIsSavingHome(true);
        try {
            const updated = await responderAPI.updateResponder(responder.id, {
                location_id: nextId,
            });

            setCache((prev) => ({
                ...prev,
                responders: (prev.responders ?? []).map((r) =>
                    r.id === updated.id ? { ...r, ...updated } : r,
                ),
            }));
            addResponderToCache({ ...responder, ...updated });
            await refreshMembership();

            toastSuccess("Home site updated.");
        } catch (error) {
            toastError(apiErrorMessage(error, "Failed to update home site."));
        } finally {
            setIsSavingHome(false);
        }
    };

    const handlePresenceChange = async (
        e: React.ChangeEvent<HTMLSelectElement>,
    ) => {
        if (!membership) return;
        const nextId = Number(e.target.value);
        const currentId =
            membership.active_location_id ?? membership.home_location_id;
        if (nextId === currentId) return;

        setIsSavingPresence(true);
        try {
            await responderAPI.setActiveSite(
                responder.id,
                nextId === membership.home_location_id ? null : nextId,
            );
            await refreshMembership();

            toastSuccess("Active site updated.");
        } catch (error) {
            toastError(
                apiErrorMessage(error, "Failed to update active site."),
            );
        } finally {
            setIsSavingPresence(false);
        }
    };

    const handleCloseDeployment = async (deploymentId: number) => {
        setClosingDeploymentId(deploymentId);
        try {
            await responderAPI.closeDeployment(responder.id, deploymentId);
            await refreshMembership();

            toastSuccess("Deployment ended.");
        } catch (error) {
            toastError(apiErrorMessage(error, "Failed to end deployment."));
        } finally {
            setClosingDeploymentId(null);
        }
    };

    const handleAddDeployment = async (
        e: React.FormEvent<HTMLFormElement>,
    ) => {
        e.preventDefault();
        if (!newSiteId || isAdding) return;

        const payload: ResponderDeploymentCreateRequest = {
            location_id: Number(newSiteId),
        };
        if (newStartsAt) payload.starts_at = new Date(newStartsAt).toISOString();
        if (newPlannedEndsAt)
            payload.planned_ends_at = new Date(newPlannedEndsAt).toISOString();

        setIsAdding(true);
        try {
            await responderAPI.openDeployment(responder.id, payload);
            await refreshMembership();

            toastSuccess("Deployment added.");
            setAddFormOpen(false);
            setNewSiteId("");
            setNewStartsAt("");
            setNewPlannedEndsAt("");
        } catch (error) {
            toastError(apiErrorMessage(error, "Failed to add deployment."));
        } finally {
            setIsAdding(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-2.5">
                <div className="skeleton w-full h-20 rounded-xl"></div>
                <div className="skeleton w-full h-20 rounded-xl"></div>
            </div>
        );
    }

    if (loadFailed || !membership) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Failed to load site membership.
            </div>
        );
    }

    const openDeployments = membership.deployments.filter(
        (d) => d.ends_at === null,
    );
    const effectiveSiteId =
        membership.active_location_id ?? membership.home_location_id;

    // The current home site may be inactive (and thus absent from listSites);
    // keep it selectable so the dropdown doesn't show a wrong value.
    const homeSiteOptions = sites.some(
        (s) => s.id === membership.home_location_id,
    )
        ? sites
        : [
              {
                  id: membership.home_location_id,
                  name: membership.home_location_name,
              } as LocationItem,
              ...sites,
          ];

    // Deployable = active sites that aren't the home site or the site of an
    // already-open deployment (backend 409s on both).
    const deployableSites = sites.filter(
        (s) =>
            s.id !== membership.home_location_id &&
            !openDeployments.some((d) => d.location_id === s.id),
    );

    return (
        <div className="space-y-2.5 text-sm">
            <h3 className="px-1 pt-1 text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-slate-400">
                Site Membership
            </h3>

            <div className="w-full rounded-xl border border-gray-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-3 shadow-sm transition-colors">
                <SectionHeader
                    icon={<MapPin className="h-3.5 w-3.5" />}
                    title="Home Site"
                />
                <select
                    value={membership.home_location_id}
                    onChange={handleHomeSiteChange}
                    disabled={isSavingHome}
                    className={selectClass}
                >
                    {homeSiteOptions.map((site) => (
                        <option key={site.id} value={site.id}>
                            {site.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="w-full rounded-xl border border-gray-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-3 shadow-sm transition-colors">
                <SectionHeader
                    icon={<Navigation className="h-3.5 w-3.5" />}
                    title="Current Site"
                />
                <select
                    value={effectiveSiteId}
                    onChange={handlePresenceChange}
                    disabled={isSavingPresence}
                    className={selectClass}
                >
                    <option value={membership.home_location_id}>
                        Home — {membership.home_location_name}
                    </option>
                    {openDeployments.map((d) => {
                        const notStarted =
                            new Date(d.starts_at) > new Date();
                        return (
                            <option
                                key={d.id}
                                value={d.location_id}
                                disabled={notStarted}
                            >
                                {d.location_name}
                                {notStarted ? " (not started)" : ""}
                            </option>
                        );
                    })}
                </select>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-slate-400">
                    Admin presence override — picking the home site clears the
                    override.
                </p>
            </div>

            <div className="w-full rounded-xl border border-gray-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-3 shadow-sm transition-colors">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <SectionHeader
                        icon={<Truck className="h-3.5 w-3.5" />}
                        title="Deployments"
                        className=""
                    />
                    {!addFormOpen && deployableSites.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setAddFormOpen(true)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                        </button>
                    )}
                </div>

                {membership.deployments.length === 0 && !addFormOpen && (
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                        No deployments — responder only belongs to the home
                        site.
                    </p>
                )}

                <div className="space-y-2">
                    {membership.deployments.map((d) => {
                        const isOpen = d.ends_at === null;
                        const isCurrent =
                            membership.active_location_id === d.location_id;
                        return (
                            <div
                                key={d.id}
                                className="rounded-lg border border-gray-200 dark:border-slate-700/50 px-2.5 py-2"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <p className="truncate font-medium text-gray-800 dark:text-slate-200">
                                        {d.location_name}
                                        {isCurrent && (
                                            <span className="ml-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                                                (current)
                                            </span>
                                        )}
                                    </p>
                                    <span
                                        className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                                            isOpen
                                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                                                : "bg-gray-100 text-gray-600 dark:bg-slate-700/60 dark:text-slate-400"
                                        }`}
                                    >
                                        {isOpen ? "Open" : "Ended"}
                                    </span>
                                </div>
                                <div className="mt-1 space-y-0.5 text-xs text-gray-500 dark:text-slate-400">
                                    <p>Started {formatTimestamp(d.starts_at)}</p>
                                    {d.ends_at !== null ? (
                                        <p>Ended {formatTimestamp(d.ends_at)}</p>
                                    ) : d.planned_ends_at !== null ? (
                                        <p>
                                            Planned end{" "}
                                            {formatTimestamp(d.planned_ends_at)}
                                        </p>
                                    ) : null}
                                </div>
                                {isOpen && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleCloseDeployment(d.id)
                                        }
                                        disabled={closingDeploymentId === d.id}
                                        className="mt-1.5 flex items-center gap-1 rounded-md text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-60 transition-colors"
                                    >
                                        {closingDeploymentId === d.id ? (
                                            <div className="spinner w-3.5 h-3.5" />
                                        ) : (
                                            <X className="w-3.5 h-3.5" />
                                        )}
                                        <span>End now</span>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {addFormOpen && (
                    <form
                        onSubmit={handleAddDeployment}
                        className="mt-2 space-y-2 rounded-lg border border-gray-200 dark:border-slate-700/50 p-2.5"
                    >
                        <select
                            value={newSiteId}
                            onChange={(e) => setNewSiteId(e.target.value)}
                            required
                            className={selectClass}
                        >
                            <option value="" disabled>
                                Select site
                            </option>
                            {deployableSites.map((site) => (
                                <option key={site.id} value={site.id}>
                                    {site.name}
                                </option>
                            ))}
                        </select>

                        <div className="grid grid-cols-2 gap-2">
                            <label className="block">
                                <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                                    Start (optional)
                                </span>
                                <input
                                    type="datetime-local"
                                    value={newStartsAt}
                                    onChange={(e) =>
                                        setNewStartsAt(e.target.value)
                                    }
                                    className={`${selectClass} text-xs`}
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                                    Planned end (optional)
                                </span>
                                <input
                                    type="datetime-local"
                                    value={newPlannedEndsAt}
                                    onChange={(e) =>
                                        setNewPlannedEndsAt(e.target.value)
                                    }
                                    className={`${selectClass} text-xs`}
                                />
                            </label>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setAddFormOpen(false)}
                                disabled={isAdding}
                                className="btn-cancel text-xs py-1.5 flex items-center gap-1"
                            >
                                <X className="w-3.5 h-3.5" />
                                <span>Cancel</span>
                            </button>
                            <button
                                type="submit"
                                disabled={!newSiteId || isAdding}
                                className="btn-custom bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-1.5 disabled:hover:bg-blue-600 flex items-center gap-1"
                            >
                                {isAdding ? (
                                    <div className="spinner w-3.5 h-3.5" />
                                ) : (
                                    <Plus className="w-3.5 h-3.5" />
                                )}
                                <span>Deploy</span>
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
