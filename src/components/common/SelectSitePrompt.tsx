import { MapPin } from "lucide-react";
import EmptyList from "./EmptyList";

interface SelectSitePromptProps {
    title?: string;
}

/**
 * Shown on site-scoped pages while the admin viewing scope is "All sites"
 * (or a site has no relevant device yet). Keeps a single empty-state style.
 */
export default function SelectSitePrompt({
    title = "Select a site from the sidebar to view this page.",
}: SelectSitePromptProps) {
    return (
        <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/50 dark:border-white/10 shadow-xl p-6">
            <EmptyList icon={MapPin} title={title} />
        </div>
    );
}
