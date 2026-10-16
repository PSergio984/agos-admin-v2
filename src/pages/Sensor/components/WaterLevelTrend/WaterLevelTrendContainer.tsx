import Container from "../../../../components/ui/Container";
import WaterLevelChart from "./WaterLevelChart";
import { useEffect, useState } from "react";
import FilterDropDown from "./FilterDropDown";
import type { SensorReadingTrendResponse } from "../../../../types/sensor";
import { sensorAPI } from "../../../../lib/api/sensor";
import LineChartSkeleton from "./LineChartSkeleton";
import { useCoreHook } from "../../../../context/CoreContext";

export interface TimeRange {
    label: string;
    days?: number;
    hours?: number;
    granularity: "Time" | "Day" | "Day & Time";
    duration: string;
}

export const timeRanges: TimeRange[] = [
    { label: "1 Hour", hours: 1, granularity: "Time", duration: "1_hour" },
    { label: "6 Hours", hours: 6, granularity: "Time", duration: "6_hours" },
    { label: "12 Hours", hours: 12, granularity: "Time", duration: "12_hours" },
    { label: "1 Day", days: 1, granularity: "Time", duration: "1_day" },
    { label: "1 Week", days: 7, granularity: "Day & Time", duration: "1_week" },
    { label: "1 Month", days: 30, granularity: "Day", duration: "1_month" },
];

export default function WaterLevelTrendContainer() {
    const { sensorDeviceDetails } = useCoreHook();
    const [chosenRange, setChosenRange] = useState<TimeRange>(timeRanges[0]);

    const [trendData, setTrendData] =
        useState<SensorReadingTrendResponse | null>(null);
    const [isFetching, setIsFetching] = useState<boolean>(false);

    const deviceId = sensorDeviceDetails.sensor_device_id;

    useEffect(() => {
        if (!deviceId) {
            setTrendData(null);
            setIsFetching(false);
            return;
        }
        const fetchTrendData = async () => {
            try {
                setIsFetching(true);
                const res = await sensorAPI.getSensorReadingTrendData(
                    chosenRange.duration,
                    deviceId,
                );
                setTrendData(res);
            } catch (error) {
            } finally {
                setIsFetching(false);
            }
        };
        fetchTrendData();
    }, [chosenRange, deviceId]);

    if (isFetching) {
        return (
            <LineChartSkeleton>
                <FilterDropDown
                    selectedRange={chosenRange}
                    setSelectedRange={setChosenRange}
                />
            </LineChartSkeleton>
        );
    }

    if (!trendData) {
        return null;
    }

    return (
        <Container className="relative h-[24rem] w-full overflow-hidden sm:h-[28rem] xl:h-[32rem]">
            <FilterDropDown
                selectedRange={chosenRange}
                setSelectedRange={setChosenRange}
            />

            <WaterLevelChart
                trendData={trendData!}
                duration={chosenRange.label}
                granularity={chosenRange.granularity}
            />
        </Container>
    );
}
