import { useRef, useState } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { useCoreHook } from "../context/CoreContext";
import type { ViewScope } from "../context/CoreContext";
import Popover from "./ui/Popover";

interface SiteScopeSwitcherProps {
    isCollapsed: boolean;
}

export default function SiteScopeSwitcher({
    isCollapsed,
}: SiteScopeSwitcherProps) {
    const { sites, viewScope, setViewScope, locationDetails } = useCoreHook();
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const label =
        viewScope === null
            ? "Loading sites…"
            : viewScope === "all"
              ? "All sites"
              : locationDetails.location_name;

    const activeSites = sites.filter((site) => site.is_active);

    const select = (scope: ViewScope) => {
        setViewScope(scope);
        setOpen(false);
    };

    const optionClass =
        "w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors";

    return (
        <div className={`${isCollapsed ? "flex justify-center" : "w-full"}`}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                disabled={viewScope === null}
                aria-label="Select site"
                title={isCollapsed ? label : "Select site"}
                className={
                    isCollapsed
                        ? "flex items-center justify-center rounded-xl p-3 text-neutral dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                        : "w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                }
            >
                <MapPin className="w-5 h-5 shrink-0 text-primary dark:text-blue-400" />
                {!isCollapsed && (
                    <>
                        <span className="flex-1 truncate text-left">
                            {label}
                        </span>
                        <ChevronDown
                            className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                        />
                    </>
                )}
            </button>

            <Popover
                open={open}
                onClose={() => setOpen(false)}
                anchorRef={triggerRef}
                matchAnchorWidth={!isCollapsed}
                gap={8}
            >
                <div className="w-52 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/50 dark:border-white/10 py-1.5 animate-dropdown-in">
                    <button
                        type="button"
                        onClick={() => select("all")}
                        className={optionClass}
                    >
                        <span className="flex-1 truncate text-left">
                            All sites
                        </span>
                        {viewScope === "all" && (
                            <Check className="w-4 h-4 shrink-0 text-primary dark:text-blue-400" />
                        )}
                    </button>

                    {activeSites.map((site) => (
                        <button
                            key={site.id}
                            type="button"
                            onClick={() => select(site.id)}
                            className={optionClass}
                        >
                            <span className="flex-1 truncate text-left">
                                {site.name}
                            </span>
                            {viewScope === site.id && (
                                <Check className="w-4 h-4 shrink-0 text-primary dark:text-blue-400" />
                            )}
                        </button>
                    ))}

                    {activeSites.length === 0 && (
                        <p className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400">
                            No active sites
                        </p>
                    )}
                </div>
            </Popover>
        </div>
    );
}
