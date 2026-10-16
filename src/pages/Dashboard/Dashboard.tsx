import PageHeader from "../../components/common/PageHeader";
import VideoContainer from "./components/VideoContainer";
import BlockageStatusCard from "./components/BlockageStatusCard";
import WeatherConditionCard from "./components/WeatherConditionCard";
import WaterLevelStatusCard from "./components/WaterLevelStatusCard";
import FusionAnalysis from "./components/FusionAnalysis";
import AllSitesWall from "./components/AllSitesWall";
import { useCoreHook } from "../../context/CoreContext";
import { useEffect } from "react";

export default function Dashboard() {
    const { isAllSites } = useCoreHook();

    useEffect(() => {
        document.title = "Dashboard - AGOS";

        return () => {
            document.title = "AGOS";
        };
    }, []);

    if (isAllSites) {
        return <AllSitesWall />;
    }

    return (
        <div className="flex flex-col gap-2">
            <PageHeader />
            <div className="flex flex-col xl:flex-row w-full gap-2">
                <VideoContainer />
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 xl:grid-rows-[0.5fr_1fr_1.3fr] xl:w-2/6">
                    <BlockageStatusCard />
                    <WeatherConditionCard />
                    <WaterLevelStatusCard className="sm:col-span-2 xl:col-span-1" />
                </div>
            </div>
            <FusionAnalysis />
        </div>
    );
}
