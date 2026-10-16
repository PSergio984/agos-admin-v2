import { useEffect } from "react";
import {
    ReadingLogsProvider,
    useReadingLogs,
} from "./context/ReadingLogsContext";
import {
    SummaryCardsContainer,
    ChartsContainer,
    DataTableContainer,
} from "./components";
import Header from "./components/Header";
import AnalyzePanel from "./components/Analyze/AnalyzePanel";
import DayDetailPanel from "./components/DataTable/DayDetailPanel/DayDetailPanel";
import SelectSitePrompt from "../../components/common/SelectSitePrompt";
import { useCoreHook } from "../../context/CoreContext";

function ReadingLogsContent() {
    const { analyzeDrawerIsOpen, selectedSummary, setSelectedSummary } = useReadingLogs();

    return (
        <div className="">
            <div className="flex flex-col gap-2 ">
                <Header />
                <SummaryCardsContainer />
                <ChartsContainer />
                <DataTableContainer />
            </div>

            {analyzeDrawerIsOpen && <AnalyzePanel />}
            {selectedSummary && (
                <DayDetailPanel
                    summary={selectedSummary}
                    onClose={() => setSelectedSummary(null)}
                />
            )}
        </div>
    );
}

export default function ReadingLogs() {
    const { isAllSites } = useCoreHook();

    useEffect(() => {
        document.title = "Daily Analysis - AGOS";
        return () => {
            document.title = "AGOS";
        };
    }, []);

    if (isAllSites) {
        return <SelectSitePrompt title="Select a site to view its reading logs." />;
    }

    return (
        <ReadingLogsProvider>
            <ReadingLogsContent />
        </ReadingLogsProvider>
    );
}
