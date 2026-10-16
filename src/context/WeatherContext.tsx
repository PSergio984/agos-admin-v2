import {
    useState,
    useMemo,
    createContext,
    useContext,
    type ReactNode,
} from "react";
import type {
    WeatherConditionSummaryResponse,
    WeatherData,
} from "../types/weather";
import { useWebSocketMessage } from "./WebSocketContext";
import { useCoreHook } from "./CoreContext";
import { getWeatherColor, getWeatherIcon } from "../lib/utils/weather";

interface WeatherContextValue {
    weatherData: WeatherData | null;
    isFetching: boolean;

    warning: string | null;
    error: string | null;
}

const WeatherContext = createContext<WeatherContextValue | undefined>(
    undefined,
);

export function WeatherProvider({ children }: { children: ReactNode }) {
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [isFetching, setIsFetching] = useState<boolean>(true);

    const [warning, setWarning] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { locationDetails } = useCoreHook();

    // Weather readings are site-scoped — when the scope changes, reset
    // during render so the previous site's data is never painted.
    const [seenLocationId, setSeenLocationId] = useState(
        locationDetails.location_id,
    );
    if (seenLocationId !== locationDetails.location_id) {
        setSeenLocationId(locationDetails.location_id);
        setWeatherData(null);
        setIsFetching(true);
        setWarning(null);
        setError(null);
    }

    useWebSocketMessage(
        "weather_update",
        (data: WeatherConditionSummaryResponse) => {
            setIsFetching(false);

            if (data.status == "error") {
                setError(data.message);
                setWarning(null);
                setWeatherData(null);
                return;
            }

            const weatherCondition = {
                precipitation_mm: data.weather_condition.precipitation_mm,
                condition: data.weather_condition.condition,
                description: data.weather_condition.description,
                timestamp: data.weather_condition.timestamp,
                icon: getWeatherIcon(data.weather_condition.weather_code),
                color: getWeatherColor(data.weather_condition.precipitation_mm),
            } as WeatherData;

            if (data.status == "warning") {
                setWarning(data.message);
                setError(null);
                setWeatherData(weatherCondition);
                return;
            }

            setError(null);
            setWarning(null);
            setWeatherData(weatherCondition);
        },
    );

    const contextValue = useMemo(
        () => ({
            weatherData,
            isFetching,
            warning,
            error,
        }),
        [weatherData, isFetching, warning, error],
    );

    return (
        <WeatherContext.Provider value={contextValue}>
            {children}
        </WeatherContext.Provider>
    );
}

export const useWeather = () => {
    const context = useContext(WeatherContext);
    if (context === undefined) {
        throw new Error("useWeather must be used within a WeatherProvider");
    }
    return context;
};
