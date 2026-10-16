import { useId, useState } from "react";
import { X } from "lucide-react";

import ModalContainer from "../../../components/common/ModalContainer";
import { useToast } from "../../../context/ToastContext";
import {
    cameraDevicesAPI,
    sensorDevicesAPI,
} from "../../../lib/api/devices";
import type {
    CameraDeviceItem,
    SensorDeviceItem,
} from "../../../types/devices";
import type { DeviceFormState } from "../context/SitesPageContext";
import { useSites } from "../context/SitesPageContext";

interface DeviceFormModalProps {
    form: DeviceFormState;
    onClose: () => void;
}

interface FormErrors {
    device_name?: string;
    installation_height?: string;
    warning_threshold?: string;
    critical_threshold?: string;
}

function getIntegerError(value: string): string | undefined {
    if (value.trim() === "") return "Required";
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) return "Enter a whole number";
    if (parsed <= 0) return "Must be greater than 0";
    return undefined;
}

export default function DeviceFormModal({
    form,
    onClose,
}: DeviceFormModalProps) {
    const isSensor = form.kind === "sensor";
    const isEdit = form.device !== null;
    const sensorDevice = isSensor
        ? (form.device as SensorDeviceItem | null)
        : null;
    const cameraDevice = !isSensor
        ? (form.device as CameraDeviceItem | null)
        : null;

    const { toastSuccess, toastError } = useToast();
    const { sites, upsertDevice } = useSites();
    const fieldPrefix = useId();
    const titleId = `${fieldPrefix}-title`;
    const nameId = `${fieldPrefix}-name`;
    const siteId = `${fieldPrefix}-site`;
    const streamUrlId = `${fieldPrefix}-stream-url`;
    const installationHeightId = `${fieldPrefix}-installation-height`;
    const warningThresholdId = `${fieldPrefix}-warning-threshold`;
    const criticalThresholdId = `${fieldPrefix}-critical-threshold`;

    const [deviceName, setDeviceName] = useState(
        form.device?.device_name ?? "",
    );
    const [locationId, setLocationId] = useState<number>(
        form.device?.location_id ?? form.siteId,
    );
    const [streamUrl, setStreamUrl] = useState(
        cameraDevice?.stream_url ?? "",
    );
    const [installationHeight, setInstallationHeight] = useState(
        sensorDevice?.sensor_config.installation_height != null
            ? sensorDevice.sensor_config.installation_height.toString()
            : "",
    );
    const [warningThreshold, setWarningThreshold] = useState(
        sensorDevice?.sensor_config.warning_threshold != null
            ? sensorDevice.sensor_config.warning_threshold.toString()
            : "",
    );
    const [criticalThreshold, setCriticalThreshold] = useState(
        sensorDevice?.sensor_config.critical_threshold != null
            ? sensorDevice.sensor_config.critical_threshold.toString()
            : "",
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
        if (!deviceName.trim()) {
            nextErrors.device_name = "Device name is required";
        }
        if (isSensor) {
            const heightError = getIntegerError(installationHeight);
            if (heightError) nextErrors.installation_height = heightError;
            const warningError = getIntegerError(warningThreshold);
            if (warningError) nextErrors.warning_threshold = warningError;
            const criticalError = getIntegerError(criticalThreshold);
            if (criticalError) nextErrors.critical_threshold = criticalError;
            // Mirrors the backend SensorConfig ordering rule.
            if (
                !warningError &&
                !criticalError &&
                Number(warningThreshold) >= Number(criticalThreshold)
            ) {
                nextErrors.warning_threshold =
                    "Warning threshold must be lower than critical threshold";
                nextErrors.critical_threshold =
                    "Critical threshold must be higher than warning threshold";
            }
        }

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setErrors({});
        setIsSaving(true);
        try {
            if (isSensor) {
                const sensorConfig = {
                    installation_height: Number(installationHeight),
                    warning_threshold: Number(warningThreshold),
                    critical_threshold: Number(criticalThreshold),
                };
                const saved = isEdit
                    ? await sensorDevicesAPI.update(form.device!.id, {
                          device_name: deviceName.trim(),
                          location_id: locationId,
                          sensor_config: sensorConfig,
                      })
                    : await sensorDevicesAPI.create({
                          device_name: deviceName.trim(),
                          location_id: locationId,
                          sensor_config: sensorConfig,
                      });
                upsertDevice("sensor", saved);
            } else {
                const trimmedUrl = streamUrl.trim();
                const saved = isEdit
                    ? await cameraDevicesAPI.update(form.device!.id, {
                          device_name: deviceName.trim(),
                          location_id: locationId,
                          stream_url: trimmedUrl || null,
                      })
                    : await cameraDevicesAPI.create({
                          device_name: deviceName.trim(),
                          location_id: locationId,
                          stream_url: trimmedUrl || null,
                      });
                upsertDevice("camera", saved);
            }
            toastSuccess(
                isEdit
                    ? `${isSensor ? "Sensor" : "Camera"} device updated`
                    : `${isSensor ? "Sensor" : "Camera"} device created`,
            );
            onClose();
        } catch {
            toastError(
                `Failed to save ${isSensor ? "sensor" : "camera"} device`,
            );
        } finally {
            setIsSaving(false);
        }
    };

    const inputClass =
        "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/40 aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-60";
    const labelClass =
        "block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1";
    const errorClass =
        "mt-1.5 text-xs font-medium text-red-600 dark:text-red-400";
    const handleClose = () => {
        if (!isSaving) onClose();
    };

    const sensorField = (
        id: string,
        label: string,
        value: string,
        setValue: (v: string) => void,
        field: keyof FormErrors,
    ) => (
        <div>
            <label htmlFor={id} className={labelClass}>
                {label}
            </label>
            <div className="flex items-center gap-2">
                <input
                    id={id}
                    type="number"
                    step="1"
                    min={1}
                    disabled={isSaving}
                    className={inputClass}
                    value={value}
                    aria-invalid={Boolean(errors[field])}
                    aria-describedby={
                        errors[field] ? `${id}-error` : undefined
                    }
                    onChange={(e) => {
                        setValue(e.target.value);
                        if (errors[field]) clearError(field);
                    }}
                />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                    cm
                </span>
            </div>
            {errors[field] && (
                <p id={`${id}-error`} role="alert" className={errorClass}>
                    {errors[field]}
                </p>
            )}
        </div>
    );

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
                        {isEdit
                            ? `Edit ${isSensor ? "Sensor" : "Camera"} Device`
                            : `Add ${isSensor ? "Sensor" : "Camera"} Device`}
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
                            Device Name
                        </label>
                        <input
                            id={nameId}
                            autoFocus
                            disabled={isSaving}
                            className={inputClass}
                            value={deviceName}
                            aria-invalid={Boolean(errors.device_name)}
                            aria-describedby={
                                errors.device_name
                                    ? `${nameId}-error`
                                    : undefined
                            }
                            onChange={(e) => {
                                const nextName = e.target.value;
                                setDeviceName(nextName);
                                if (errors.device_name && nextName.trim()) {
                                    clearError("device_name");
                                }
                            }}
                            placeholder={
                                isSensor
                                    ? "e.g. Ultrasonic Sensor A"
                                    : "e.g. Canal CCTV 1"
                            }
                            maxLength={100}
                        />
                        {errors.device_name && (
                            <p
                                id={`${nameId}-error`}
                                role="alert"
                                className={errorClass}
                            >
                                {errors.device_name}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor={siteId} className={labelClass}>
                            Site
                        </label>
                        <select
                            id={siteId}
                            disabled={isSaving}
                            className={inputClass}
                            value={locationId}
                            onChange={(e) =>
                                setLocationId(Number(e.target.value))
                            }
                        >
                            {sites.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                    {s.is_active ? "" : " (inactive)"}
                                </option>
                            ))}
                        </select>
                    </div>

                    {isSensor ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {sensorField(
                                installationHeightId,
                                "Install Height",
                                installationHeight,
                                setInstallationHeight,
                                "installation_height",
                            )}
                            {sensorField(
                                warningThresholdId,
                                "Warning",
                                warningThreshold,
                                setWarningThreshold,
                                "warning_threshold",
                            )}
                            {sensorField(
                                criticalThresholdId,
                                "Critical",
                                criticalThreshold,
                                setCriticalThreshold,
                                "critical_threshold",
                            )}
                        </div>
                    ) : (
                        <div>
                            <label htmlFor={streamUrlId} className={labelClass}>
                                Stream URL (optional)
                            </label>
                            <input
                                id={streamUrlId}
                                type="url"
                                disabled={isSaving}
                                className={inputClass}
                                value={streamUrl}
                                onChange={(e) =>
                                    setStreamUrl(e.target.value)
                                }
                                placeholder="rtsp://… or https://…"
                            />
                        </div>
                    )}

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
