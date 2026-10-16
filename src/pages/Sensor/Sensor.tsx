import SensorStatus from "./components/SensorStatus";
import SensorReadings from "./components/SensorReadings";
import SelectSitePrompt from "../../components/common/SelectSitePrompt";
import { useCoreHook } from "../../context/CoreContext";
import { useEffect } from "react";
import WaterLevelTrendContainer from "./components/WaterLevelTrend";

export default function Sensor() {
    const { isAllSites } = useCoreHook();

    useEffect(() => {
        document.title = "Sensor - AGOS";

        return () => {
            document.title = "AGOS";
        };
    }, []);

    if (isAllSites) {
        return <SelectSitePrompt title="Select a site to view its sensor." />;
    }

    return (
        <div className="flex flex-col gap-2 min-w-0">
            <WaterLevelTrendContainer />
            <div className="flex flex-col xl:flex-row gap-2 xl:h-[30rem]">
                <SensorReadings />
                <SensorStatus />
            </div>
        </div>
    );
}
