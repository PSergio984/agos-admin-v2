import { useState } from "react";
import { AlertTriangle, PowerOff, X } from "lucide-react";

import ModalContainer from "../../../components/common/ModalContainer";

interface ConfirmDeactivateModalProps {
    title: string;
    name: string;
    description: string;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

export default function ConfirmDeactivateModal({
    title,
    name,
    description,
    onClose,
    onConfirm,
}: ConfirmDeactivateModalProps) {
    const [isDeactivating, setIsDeactivating] = useState(false);

    const handleConfirm = async () => {
        if (isDeactivating) return;

        setIsDeactivating(true);
        try {
            await onConfirm();
        } finally {
            setIsDeactivating(false);
        }
    };

    const handleClose = () => {
        if (!isDeactivating) onClose();
    };

    return (
        <ModalContainer setModalOpen={handleClose}>
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-deactivate-title"
                aria-describedby="confirm-deactivate-description"
                className="mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <h2
                            id="confirm-deactivate-title"
                            className="text-lg font-bold text-slate-900 dark:text-slate-100"
                        >
                            {title}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isDeactivating}
                        aria-label="Close deactivation confirmation"
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <p
                    id="confirm-deactivate-description"
                    className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-300"
                >
                    You’re about to deactivate{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">
                        {name}
                    </span>
                    . {description}
                </p>

                <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <button
                        type="button"
                        autoFocus
                        onClick={handleClose}
                        disabled={isDeactivating}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isDeactivating}
                        className="inline-flex min-w-24 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isDeactivating ? (
                            <>
                                <div className="spinner h-4 w-4" />
                                Deactivating...
                            </>
                        ) : (
                            <>
                                <PowerOff className="h-4 w-4" />
                                Deactivate
                            </>
                        )}
                    </button>
                </div>
            </div>
        </ModalContainer>
    );
}
