import { useEffect, useState } from "react";
import Container from "../../../../components/ui/Container";
import type { SensorDeviceStatus } from "../../../../types/sensor";
import { useToast } from "../../../../context/ToastContext";
import { useCoreHook } from "../../../../context/CoreContext";
import { sensorAPI } from "../../../../lib/api/sensor";
import ConnectionContainer from "./components/ConnectionContianer";
import LastUpdatedContainer from "./components/LastUpdatedContainer";
import SignalContainer from "./components/SignalContainer";

export interface CardProps {
    value: string;
}

const Details = ({ label, value }: { label: string; value: string }) => {
    return (
        <div className="flex items-center">
            <p className="text-sm min-w-[4.5rem] text-gray-700 dark:text-slate-400 transition-colors">{label}</p>
            <p className="text-sm font-medium text-neutral dark:text-slate-200 transition-colors">{value}</p>
        </div>
    );
};

export default function SensorStatus() {
    const [sensorStatus, setSensorStatus] = useState<SensorDeviceStatus | null>(
        null
    );
    const [isFetching, setIsFetching] = useState<boolean>(true);

    const { toastError } = useToast();
    const { sensorDeviceDetails } = useCoreHook();
    const deviceId = sensorDeviceDetails.sensor_device_id;

    useEffect(() => {
        if (!deviceId) {
            setSensorStatus(null);
            setIsFetching(false);
            return;
        }
        const fetchStatus = async () => {
            try {
                setIsFetching(true);
                const res = await sensorAPI.getSensorStatus(deviceId);
                setSensorStatus(res);
            } catch (error) {
                console.log(error);
                toastError("Failed to fetch sensor status.");
            } finally {
                setIsFetching(false);
            }
        };

        fetchStatus();
    }, [deviceId]);

    if (isFetching) {
        return (
            <Container
                headerTitle="SENSOR STATUS"
                className="flex flex-col justify-between xl:w-1/4"
            >
                <div className="space-y-3">
                    <div className="rounded-md skeleton w-full h-24"></div>
                    <div className="rounded-md skeleton w-full h-24"></div>
                    <div className="rounded-md skeleton w-full h-24"></div>
                </div>
                <div className="space-y-3">
                    <div className="rounded-md skeleton w-2/3 h-7"></div>
                    <div className="rounded-md skeleton w-2/3 h-7"></div>
                </div>
            </Container>
        );
    }

    return (
        <Container
            headerTitle="SENSOR STATUS"
            className="flex flex-col justify-between xl:w-1/4"
        >
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1 xl:grid-rows-3">
                <ConnectionContainer value={sensorStatus?.connection || ""} />
                <LastUpdatedContainer
                    value={sensorStatus?.last_updated || ""}
                />
                <SignalContainer value={sensorStatus?.signal || ""} />
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700/50 mt-5 pt-3 space-y-1 transition-colors">
                <Details
                    label="Device:"
                    value={sensorStatus?.device_name || ""}
                />
                <Details
                    label="Location:"
                    value={sensorStatus?.location_name || ""}
                />
            </div>
        </Container>
    );
}
