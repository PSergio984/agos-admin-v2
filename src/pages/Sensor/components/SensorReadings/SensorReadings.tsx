import { useEffect, useRef, useState } from "react";
import Container from "../../../../components/ui/Container";
import type {
    SensorReading,
    SensorReadingResponse,
} from "../../../../types/sensor";
import { sensorAPI } from "../../../../lib/api/sensor";
import { useToast } from "../../../../context/ToastContext";
import Table from "./components/Table";
import TableSkeleton from "../../../../components/common/TableSkeleton";
import ExportToExcelButton from "./components/ExportToExcelButton";
import EmptyList from "../../../../components/common/EmptyList";
import { FileText } from "lucide-react";
import { useCoreHook } from "../../../../context/CoreContext";

export default function SensorReadings() {
    const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(true);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const { toastError } = useToast();
    const { sensorDeviceDetails } = useCoreHook();

    const [page, setPage] = useState<number>(1);
    const [isFetchingMore, setIsFetchingMore] = useState<boolean>(true);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const observerTarget = useRef<HTMLDivElement | null>(null);

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0].isIntersecting &&
                    hasMore &&
                    !isFetchingMore &&
                    !isFetching
                ) {
                    setPage((prev) => prev + 1);
                }
            },
            {
                root: containerRef.current,
                threshold: 0.1,
            },
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        // Cleanup function
        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [hasMore, isFetchingMore, isFetching]);

    const deviceId = sensorDeviceDetails.sensor_device_id;
    const prevDeviceIdRef = useRef(deviceId);

    useEffect(() => {
        if (!deviceId) {
            // No device under the current scope — show the empty state
            // instead of firing a request with id 0.
            prevDeviceIdRef.current = deviceId;
            setSensorReadings([]);
            setHasMore(false);
            setIsFetching(false);
            setIsFetchingMore(false);
            return;
        }

        const deviceChanged = prevDeviceIdRef.current !== deviceId;

        // When the selected device changes while paginated, reset to page 1.
        // The effect re-runs with page=1 and fetches fresh data for the new device.
        if (deviceChanged && page !== 1) {
            prevDeviceIdRef.current = deviceId;
            setSensorReadings([]);
            setHasMore(true);
            setPage(1);
            return;
        }
        prevDeviceIdRef.current = deviceId;

        const fetchSensorReadings = async () => {
            try {
                if (page === 1) {
                    setIsFetching(true);
                } else {
                    setIsFetchingMore(true);
                }

                const res: SensorReadingResponse =
                    await sensorAPI.getLatestSensorReadings(page, 10, deviceId);
                // Replace on the first page (initial load or device switch),
                // append on subsequent pages.
                setSensorReadings((prev) =>
                    page === 1 ? res.items : [...prev, ...res.items],
                );
                setHasMore(res.has_more);
            } catch (error) {
                console.log("Error fetching sensor readings:", error);
                toastError("Failed to fetch sensor readings.");
                setHasMore(false); // Stop further fetches on error
            } finally {
                setIsFetching(false);
                setIsFetchingMore(false);
            }
        };

        fetchSensorReadings();
    }, [page, deviceId]);

    if (isFetching) {
        return <TableSkeleton title="SENSOR READINGS" rows={7} />;
    }

    return (
        <Container
            headerTitle="SENSOR READINGS"
            className="w-full flex flex-col relative h-[24rem] sm:h-[30rem] xl:h-auto xl:flex-1"
        >
            {sensorReadings.length > 0 && <ExportToExcelButton />}

            <div ref={containerRef} className="flex-1 overflow-auto custom-scrollbar">
                <Table sensorReadings={sensorReadings} />

                {/* Loading indicator for fetching more data */}
                {isFetchingMore && (
                    <div className="space-y-3 mt-3">
                        <div className="skeleton rounded-md w-full h-12"></div>
                        <div className="skeleton rounded-md w-full h-12"></div>
                    </div>
                )}

                {/* Invisible element to trigger loading */}
                {hasMore && <div ref={observerTarget} className="h-4"></div>}

                {!hasMore && sensorReadings.length > 0 && (
                    <p className="text-center text-sm text-gray-500 py-4">
                        No more data
                    </p>
                )}

                {sensorReadings.length === 0 && (
                    <EmptyList
                        icon={FileText}
                        title="No sensor readings available."
                    />
                )}
            </div>
        </Container>
    );
}
