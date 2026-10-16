import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, Dispatch, SetStateAction } from "react";
import axios from "axios";
import { Download, FileSpreadsheet, Plus } from "lucide-react";
import { useResponderList } from "../../context/ResponderListContext";
import {
    isValidPHMobileNumber,
    normalizeNumberInput,
} from "../../../../../../lib/utils/formatter";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { type ResponderEntry, createEmptyResponder } from "./types";
import { parseRowToResponder } from "./fileImportUtils";
import ResponderEntryRow from "./ResponderEntryRow";
import { useToast } from "../../../../../../context/ToastContext";
import { useResponders } from "../../../../context/RespondersPageContext";
import { useCoreHook } from "../../../../../../context/CoreContext";
import { responderAPI } from "../../../../../../lib/api/responder";

interface FastAPIValidationIssue {
    loc?: Array<string | number>;
    msg?: string;
}

const RESPONDER_FIELD_LABELS: Record<string, string> = {
    first_name: "First name",
    last_name: "Last name",
    phone_number: "Phone number",
    location_id: "Home site",
};

const getSubmitErrorMessage = (error: unknown): string => {
    const fallback = "Failed to add responders. Please try again.";
    if (!axios.isAxiosError(error)) return fallback;

    const detail: unknown = error.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (!Array.isArray(detail)) return fallback;

    const messages = detail
        .map((issue: FastAPIValidationIssue) => {
            if (typeof issue?.msg !== "string") return null;

            const location = Array.isArray(issue.loc) ? issue.loc : [];
            const responderIndex = location.find(
                (part): part is number => typeof part === "number",
            );
            const field = location.at(-1);
            const fieldLabel =
                typeof field === "string"
                    ? RESPONDER_FIELD_LABELS[field]
                    : undefined;
            const prefix = [
                responderIndex !== undefined
                    ? `Responder ${responderIndex + 1}`
                    : null,
                fieldLabel,
            ]
                .filter(Boolean)
                .join(" — ");
            const message = issue.msg.replace(/^Value error,\s*/i, "");

            return prefix ? `${prefix}: ${message}` : message;
        })
        .filter((message): message is string => Boolean(message));

    return messages.length > 0 ? messages.join(" ") : fallback;
};

export default function AddResponderForm() {
    const { addResponderFormOpen, setAddResponderFormOpen } =
        useResponderList();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [responders, setResponders] = useState<ResponderEntry[]>([
        createEmptyResponder(),
    ]);
    const [isLoading, setIsLoading] = useState(false);

    const { toastSuccess, toastError } = useToast();
    const { setCache } = useResponders();
    const { sites } = useCoreHook();

    // Every responder in a batch shares one home site — per-responder
    // reassignment lives in the details drawer's Site Membership section.
    const [homeSiteId, setHomeSiteId] = useState<string>("");

    // Reset form when closed
    useEffect(() => {
        if (!addResponderFormOpen) {
            setResponders([createEmptyResponder()]);
            setHomeSiteId("");
        }
    }, [addResponderFormOpen]);

    const updateResponder = (
        index: number,
        field: keyof ResponderEntry,
        value: string,
    ) => {
        setResponders((prev) =>
            prev.map((responder, i) =>
                i === index ? { ...responder, [field]: value } : responder,
            ),
        );
    };

    const handlePhoneNumberChange = (index: number) => (input: string) => {
        normalizeNumberInput(
            input,
            (value) => updateResponder(index, "phoneNumber", value as string),
            (value) =>
                updateResponder(
                    index,
                    "normalizedPhoneNumber",
                    value as string,
                ),
        );
    };

    const createFieldSetter =
        (
            index: number,
            field: keyof ResponderEntry,
        ): Dispatch<SetStateAction<string>> =>
        (value) => {
            updateResponder(index, field, value as string);
        };

    const addResponder = () => {
        setResponders((prev) => [...prev, createEmptyResponder()]);
    };

    const removeResponder = (index: number) => {
        if (responders.length > 1) {
            setResponders((prev) => prev.filter((_, i) => i !== index));
        }
    };

    const isFormValid =
        homeSiteId !== "" &&
        responders.every(
            (r) =>
                r.firstName.trim() &&
                r.lastName.trim() &&
                isValidPHMobileNumber(r.normalizedPhoneNumber),
        );

    const handleCancel = () => {
        setAddResponderFormOpen(false);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const payload = responders.map((r) => ({
                first_name: r.firstName.trim(),
                last_name: r.lastName.trim(),
                phone_number: r.normalizedPhoneNumber,
                location_id: Number(homeSiteId),
            }));

            const newResponders =
                await responderAPI.bulkCreateResponders(payload);

            setCache((prev) => ({
                ...prev,
                responders: [...(prev.responders ?? []), ...newResponders],
            }));

            toastSuccess("Responders added successfully!");
            setAddResponderFormOpen(false);
        } catch (error) {
            console.error("Failed to add responders:", error);
            toastError(getSubmitErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            await responderAPI.downloadTemplate();
        } catch {
            toastError("Failed to download template.");
        }
    };

    const handleFileImport = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        const isCSV = fileName.endsWith(".csv");
        const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

        const processData = (rows: Record<string, string>[]) => {
            const parsed = rows
                .map(parseRowToResponder)
                .filter((r): r is ResponderEntry => r !== null);

            if (parsed.length > 0) {
                // Replace empty form or append to existing entries
                setResponders((prev) => {
                    const hasOnlyEmpty =
                        prev.length === 1 &&
                        !prev[0].firstName &&
                        !prev[0].lastName &&
                        !prev[0].phoneNumber;
                    return hasOnlyEmpty ? parsed : [...prev, ...parsed];
                });
            }
        };

        if (isCSV) {
            Papa.parse<Record<string, string>>(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    processData(results.data);
                },
            });
        } else if (isExcel) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json<Record<string, string>>(
                    sheet,
                    { defval: "" },
                );
                processData(rows);
            };
            reader.readAsBinaryString(file);
        }

        // Reset file input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className={`bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700/50 overflow-hidden transition-all duration-200 flex flex-col ${
                addResponderFormOpen ? "flex-1 p-4" : "max-h-0 p-0 border-0"
            }`}
        >
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-slate-700/50">
                <label
                    htmlFor="responder-home-site"
                    className="text-sm font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap"
                >
                    Home Site
                </label>
                <select
                    id="responder-home-site"
                    value={homeSiteId}
                    onChange={(e) => setHomeSiteId(e.target.value)}
                    className="flex-1 max-w-xs rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-gray-900 dark:text-slate-100"
                >
                    <option value="" disabled>
                        Select a site
                    </option>
                    {sites.map((site) => (
                        <option key={site.id} value={site.id}>
                            {site.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {responders.map((responder, index) => (
                    <ResponderEntryRow
                        key={index}
                        firstName={responder.firstName}
                        lastName={responder.lastName}
                        phoneNumber={responder.phoneNumber}
                        normalizedPhoneNumber={responder.normalizedPhoneNumber}
                        setFirstName={createFieldSetter(index, "firstName")}
                        setLastName={createFieldSetter(index, "lastName")}
                        handlePhoneNumberChange={handlePhoneNumberChange(index)}
                        onRemove={() => removeResponder(index)}
                        canRemove={responders.length > 1}
                    />
                ))}
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-slate-700/50 gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={addResponder}
                        className="text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 btn-custom transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Another</span>
                    </button>

                    <span className="text-gray-300 dark:text-slate-600">|</span>

                    <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 btn-custom transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span>Download Template</span>
                    </button>

                    <span className="text-gray-300 dark:text-slate-600">|</span>

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-gray-600 dark:text-slate-300 hover:text-green-600 dark:hover:text-emerald-400 hover:bg-green-50 dark:hover:bg-emerald-900/20 btn-custom transition-colors"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Import from File</span>
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileImport}
                        className="hidden"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="btn-cancel text-sm py-2"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!isFormValid || isLoading}
                        className="btn-custom bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 disabled:hover:bg-blue-600"
                    >
                        {isLoading && <div className="spinner w-4 h-4"></div>}
                        <span>
                            {responders.length > 1
                                ? `Add ${responders.length} Responders`
                                : "Add Responder"}
                        </span>
                    </button>
                </div>
            </div>
        </form>
    );
}
