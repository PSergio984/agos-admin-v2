import { useEffect, useState } from "react";
import type { ResponderAllDetails } from "../../../../../../types/responder";
import { useResponderList } from "../../context/ResponderListContext";
import { responderAPI } from "../../../../../../lib/api/responder";
import { Pencil, X } from "lucide-react";

import ResponderAdditionalDetails from "./ResponderAdditionalDetails";
import ResponderSitesSection from "./ResponderSitesSection";
import EditResponderForm from "./EditResponderForm";

import PendingDetails from "./PendingDetails";
import ResponderDetailsSkeleton from "./ResponderDetailsSkeleton";

const ResponderName = ({
    fullName,
    status,
}: {
    fullName: string;
    status: string;
}) => {
    const initials =
        fullName
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || "R";
    const isPending = status.toLowerCase() === "pending";

    return (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 p-4 text-sm text-white shadow-sm">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-white/10" />
            <div className="relative flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 font-semibold">
                    {initials}
                </div>
                <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">
                        {fullName}
                    </h2>
                    <p className="text-blue-100">Responder Profile</p>
                </div>
                <span
                    className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wide ${
                        isPending
                            ? "bg-amber-200/90 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 ring-1 ring-amber-300 dark:ring-amber-500/50"
                            : "bg-emerald-200/90 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-300 dark:ring-emerald-500/50"
                    }`}
                >
                    {status.toUpperCase()}
                </span>
            </div>
        </div>
    );
};

const ActiveResponderDetails = ({
    responder,
}: {
    responder: ResponderAllDetails;
}) => {
    return (
        <>
            <ResponderName
                fullName={`${responder.first_name} ${responder.last_name}`}
                status={responder.status}
            />
            <ResponderAdditionalDetails responder={responder} />
        </>
    );
};

const PendingResponderDetails = ({
    responder,
}: {
    responder: ResponderAllDetails;
}) => {
    return (
        <>
            <ResponderName
                fullName={`${responder.first_name} ${responder.last_name}`}
                status={responder.status}
            />
            <PendingDetails submittedAt={responder.created_at} />
            <ResponderAdditionalDetails responder={responder} />
        </>
    );
};

const MainDetails = ({ responder }: { responder: ResponderAllDetails }) => {
    const { setSideDrawerOpen } = useResponderList();
    const [isEditing, setIsEditing] = useState(false);
    const isPending = responder.status.toLowerCase() === "pending";

    return (
        <>
            <div className="flex items-start justify-between border-b border-gray-200 dark:border-slate-700/50 pb-3">
                <div>
                    <h2 className="font-semibold text-gray-800 dark:text-slate-200">
                        {isEditing
                            ? "EDIT RESPONDER"
                            : isPending
                              ? "APPLICATION REVIEW"
                              : "RESPONDER DETAILS"}
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                        {isEditing
                            ? "Update name or phone number."
                            : isPending
                              ? "Check responder data before approval."
                              : "Responder profile and activity metadata."}
                    </p>
                </div>

                <div className="flex items-center gap-1.5">
                    {!isEditing && (
                        <button
                            className="rounded-md border border-gray-300 dark:border-slate-600 p-1.5 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            onClick={() => setIsEditing(true)}
                            aria-label="Edit responder"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        className="rounded-md border border-gray-300 dark:border-slate-600 p-1.5 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        onClick={() => setSideDrawerOpen(false)}
                        aria-label="Close drawer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {isEditing ? (
                <EditResponderForm
                    responder={responder}
                    onCancel={() => setIsEditing(false)}
                    onSaved={() => setIsEditing(false)}
                />
            ) : (
                <>
                    {isPending && <PendingResponderDetails responder={responder} />}
                    {!isPending && <ActiveResponderDetails responder={responder} />}
                    <ResponderSitesSection
                        key={responder.id}
                        responder={responder}
                    />
                </>
            )}
        </>
    );
};

export default function ResponderDetails() {
    const {
        sideDrawerOpen,
        chosenResponder,
        cachedResponders,
        responderExistsInCache,
        addResponderToCache,
    } = useResponderList();

    const [responder, setResponder] = useState<ResponderAllDetails | null>(
        null,
    );
    const [isFetching, setIsFetching] = useState(false);

    useEffect(() => {
        if (!chosenResponder) {
            return;
        }

        const fetchResponderDetails = async () => {
            if (responderExistsInCache(chosenResponder.id)) {
                setResponder(cachedResponders[chosenResponder.id]);
                return;
            }

            try {
                setIsFetching(true);
                const res = await responderAPI.getResponderDetails(
                    chosenResponder.id,
                );

                setResponder({
                    ...chosenResponder,
                    ...res,
                });
                addResponderToCache({
                    ...chosenResponder,
                    ...res,
                });
            } catch (error) {
                console.log(error);
            } finally {
                setIsFetching(false);
            }
        };

        fetchResponderDetails();
    }, [chosenResponder, cachedResponders]);

    return (
        <div
            className={`h-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl transition-all duration-300 ease-in-out shadow-2xl overflow-hidden ${sideDrawerOpen ? "w-[22rem]" : "w-0 border-transparent dark:border-transparent opacity-0"}`}
        >
            <div className="flex h-full flex-col gap-3 p-4 overflow-y-auto">
                {isFetching && <ResponderDetailsSkeleton />}

                {!isFetching && responder === null && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        Failed to load responder details.
                    </div>
                )}

                {!isFetching && responder && (
                    <MainDetails responder={responder} />
                )}
            </div>
        </div>
    );
}
