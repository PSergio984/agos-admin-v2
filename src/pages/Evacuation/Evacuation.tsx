import { MapPinned, Siren } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useEvacuation } from "../../context/EvacuationContext";
import { useCoreHook } from "../../context/CoreContext";
import SelectSitePrompt from "../../components/common/SelectSitePrompt";

const tabs = [
    {
        label: "Control & Alerts",
        path: "control",
        icon: Siren,
    },
    {
        label: "Evacuation Centers",
        path: "centers",
        icon: MapPinned,
    },
] as const;

export default function Evacuation() {
    const { recommendation } = useEvacuation();
    const { isAllSites } = useCoreHook();

    return (
        <div className="space-y-5">
            <nav
                aria-label="Evacuation sections"
                className="custom-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-700 dark:bg-slate-800/70"
            >
                {tabs.map((tab) => {
                    const TabIcon = tab.icon;
                    const showRecommendation =
                        tab.path === "control" && recommendation !== null;

                    return (
                        <NavLink
                            key={tab.path}
                            to={tab.path}
                            end
                            className={({ isActive }) =>
                                `relative inline-flex min-w-fit flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                                    isActive
                                        ? "bg-white text-primary shadow-sm dark:bg-slate-900 dark:text-blue-400"
                                        : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-100"
                                }`
                            }
                        >
                            <TabIcon className="h-4 w-4" />
                            <span>{tab.label}</span>
                            {showRecommendation && (
                                <span
                                    className="h-2 w-2 rounded-full bg-rose-500"
                                    aria-label="Active evacuation recommendation"
                                    title="Active evacuation recommendation"
                                />
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {isAllSites ? (
                <SelectSitePrompt title="Select a site to manage evacuation." />
            ) : (
                <Outlet />
            )}
        </div>
    );
}
