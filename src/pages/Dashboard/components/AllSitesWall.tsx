import { useState } from "react";
import {
    LayoutGrid,
    LayoutList,
    MapPinOff,
    type LucideIcon,
} from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import EmptyList from "../../../components/common/EmptyList";
import { useCoreHook } from "../../../context/CoreContext";
import WallSiteTile, { type WallMode } from "./Wall/WallSiteTile";

const MODE_OPTIONS: { value: WallMode; label: string; icon: LucideIcon }[] = [
    { value: "frames", label: "Frames", icon: LayoutGrid },
    { value: "summary", label: "Summary", icon: LayoutList },
];

function WallModeToggle({
    mode,
    onChange,
}: {
    mode: WallMode;
    onChange: (mode: WallMode) => void;
}) {
    return (
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-1">
            {MODE_OPTIONS.map(({ value, label, icon: Icon }) => {
                const isActive = mode === value;
                return (
                    <button
                        key={value}
                        type="button"
                        onClick={() => onChange(value)}
                        aria-pressed={isActive}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                            isActive
                                ? "bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-blue-400"
                                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                        }`}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * "CCTV wall" for the "All sites" scope: one tile per active site, each
 * with its own location-scoped socket. Clicking a tile scopes the whole
 * dashboard down to that site.
 */
export default function AllSitesWall() {
    const { sites } = useCoreHook();
    const [mode, setMode] = useState<WallMode>("frames");

    const activeSites = sites.filter((site) => site.is_active);

    return (
        <div className="flex flex-col gap-2">
            <PageHeader />
            <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-xl rounded-2xl p-3 md:p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-base md:text-lg">
                            All sites
                        </h2>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                            {activeSites.length} active site
                            {activeSites.length === 1 ? "" : "s"} — click a
                            tile to open its dashboard.
                        </p>
                    </div>
                    <WallModeToggle mode={mode} onChange={setMode} />
                </div>

                {activeSites.length === 0 ? (
                    <EmptyList icon={MapPinOff} title="No active sites" />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-4">
                        {activeSites.map((site) => (
                            <WallSiteTile
                                key={site.id}
                                site={site}
                                mode={mode}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
