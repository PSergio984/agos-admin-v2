import { LayoutGrid } from "lucide-react";
import { useCoreHook } from "../../../context/CoreContext";

/**
 * Placeholder for the multi-site dashboard wall (replaced by a later slice).
 */
export default function AllSitesWall() {
    const { sites } = useCoreHook();

    return (
        <div className="flex flex-1 items-center justify-center min-h-[60vh]">
            <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/50 dark:border-white/10 shadow-xl p-10 text-center max-w-md w-full">
                <LayoutGrid className="w-10 h-10 mx-auto text-primary dark:text-blue-400" />
                <h2 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
                    All-sites wall — coming soon
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {sites.length} site{sites.length === 1 ? "" : "s"}{" "}
                    registered. Select a site from the sidebar to view its
                    dashboard.
                </p>
            </div>
        </div>
    );
}
