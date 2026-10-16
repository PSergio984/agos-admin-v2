import { useId, useState } from "react";
import { X } from "lucide-react";

import ModalContainer from "../../../components/common/ModalContainer";
import { useToast } from "../../../context/ToastContext";
import { locationsAPI } from "../../../lib/api/locations";
import type { LocationItem } from "../../../types/location";
import { useSites } from "../context/SitesPageContext";

interface SiteFormModalProps {
    site: LocationItem | null; // null => create
    setOpen: (open: boolean) => void;
}

interface FormErrors {
    name?: string;
    latitude?: string;
    longitude?: string;
}

function getCoordinateError(
    value: string,
    min: number,
    max: number,
): string | undefined {
    if (value.trim() === "") return "Required";
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "Enter a valid number";
    if (parsed < min || parsed > max) return `Must be between ${min} and ${max}`;
    return undefined;
}

export default function SiteFormModal({ site, setOpen }: SiteFormModalProps) {
    const isEdit = site !== null;
    const { toastSuccess, toastError } = useToast();
    const { upsertSite } = useSites();
    const fieldPrefix = useId();
    const titleId = `${fieldPrefix}-title`;
    const nameId = `${fieldPrefix}-name`;
    const latitudeId = `${fieldPrefix}-latitude`;
    const longitudeId = `${fieldPrefix}-longitude`;

    const [name, setName] = useState(site?.name ?? "");
    const [latitude, setLatitude] = useState(
        site?.latitude != null ? site.latitude.toString() : "",
    );
    const [longitude, setLongitude] = useState(
        site?.longitude != null ? site.longitude.toString() : "",
    );
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSaving, setIsSaving] = useState(false);

    const clearError = (field: keyof FormErrors) => {
        setErrors((current) => {
            if (!current[field]) return current;
            const next = { ...current };
            delete next[field];
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const nextErrors: FormErrors = {};
        if (!name.trim()) {
            nextErrors.name = "Name is required";
        } else if (name.trim().length > 100) {
            nextErrors.name = "Name must be 100 characters or fewer";
        }
        const latError = getCoordinateError(latitude, -90, 90);
        if (latError) nextErrors.latitude = latError;
        const lngError = getCoordinateError(longitude, -180, 180);
        if (lngError) nextErrors.longitude = lngError;

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            const firstInvalidFieldId = nextErrors.name
                ? nameId
                : nextErrors.latitude
                  ? latitudeId
                  : longitudeId;
            requestAnimationFrame(() => {
                document.getElementById(firstInvalidFieldId)?.focus();
            });
            return;
        }

        setErrors({});
        setIsSaving(true);
        try {
            let saved: LocationItem;
            if (isEdit) {
                saved = await locationsAPI.updateSite(site.id, {
                    name: name.trim(),
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                });
            } else {
                saved = await locationsAPI.createSite({
                    name: name.trim(),
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                });
            }
            toastSuccess(isEdit ? "Site updated" : "Site created");
            upsertSite(saved);
            setOpen(false);
        } catch {
            toastError("Failed to save site");
        } finally {
            setIsSaving(false);
        }
    };

    const inputClass =
        "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/40 aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-60";
    const labelClass =
        "block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1";
    const handleClose = () => {
        if (!isSaving) setOpen(false);
    };

    return (
        <ModalContainer setModalOpen={handleClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="custom-scrollbar w-[92vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2
                        id={titleId}
                        className="text-lg font-bold text-slate-900 dark:text-slate-100"
                    >
                        {isEdit ? "Edit Site" : "Add Site"}
                    </h2>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSaving}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <div>
                        <label htmlFor={nameId} className={labelClass}>
                            Name
                        </label>
                        <input
                            id={nameId}
                            autoFocus
                            disabled={isSaving}
                            className={inputClass}
                            value={name}
                            aria-invalid={Boolean(errors.name)}
                            aria-describedby={
                                errors.name ? `${nameId}-error` : undefined
                            }
                            onChange={(e) => {
                                const nextName = e.target.value;
                                setName(nextName);
                                if (errors.name && nextName.trim()) {
                                    clearError("name");
                                }
                            }}
                            placeholder="e.g. Brgy. Malinta Monitoring Post"
                            maxLength={100}
                        />
                        {errors.name && (
                            <p
                                id={`${nameId}-error`}
                                role="alert"
                                className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400"
                            >
                                {errors.name}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor={latitudeId} className={labelClass}>
                                Latitude
                            </label>
                            <input
                                id={latitudeId}
                                type="number"
                                step="any"
                                disabled={isSaving}
                                className={inputClass}
                                value={latitude}
                                aria-invalid={Boolean(errors.latitude)}
                                aria-describedby={
                                    errors.latitude
                                        ? `${latitudeId}-error`
                                        : undefined
                                }
                                onChange={(e) => {
                                    setLatitude(e.target.value);
                                    if (errors.latitude) {
                                        clearError("latitude");
                                    }
                                }}
                                placeholder="14.6969"
                            />
                            {errors.latitude && (
                                <p
                                    id={`${latitudeId}-error`}
                                    role="alert"
                                    className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400"
                                >
                                    {errors.latitude}
                                </p>
                            )}
                        </div>
                        <div>
                            <label htmlFor={longitudeId} className={labelClass}>
                                Longitude
                            </label>
                            <input
                                id={longitudeId}
                                type="number"
                                step="any"
                                disabled={isSaving}
                                className={inputClass}
                                value={longitude}
                                aria-invalid={Boolean(errors.longitude)}
                                aria-describedby={
                                    errors.longitude
                                        ? `${longitudeId}-error`
                                        : undefined
                                }
                                onChange={(e) => {
                                    setLongitude(e.target.value);
                                    if (errors.longitude) {
                                        clearError("longitude");
                                    }
                                }}
                                placeholder="120.9836"
                            />
                            {errors.longitude && (
                                <p
                                    id={`${longitudeId}-error`}
                                    role="alert"
                                    className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400"
                                >
                                    {errors.longitude}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSaving}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                        >
                            {isSaving
                                ? "Saving..."
                                : isEdit
                                  ? "Save changes"
                                  : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </ModalContainer>
    );
}
