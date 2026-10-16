import type { SensorConfig } from "./sensor";

export type DeviceKind = "sensor" | "camera";

export interface SensorDeviceItem {
    id: number;
    device_name: string;
    location_id: number;
    sensor_config: SensorConfig;
    is_active: boolean;
}

export interface SensorDeviceCreateRequest {
    device_name: string;
    location_id: number;
    sensor_config: SensorConfig;
}

export interface SensorDeviceUpdateRequest {
    device_name?: string;
    location_id?: number;
    sensor_config?: SensorConfig;
    is_active?: boolean;
}

export interface CameraDeviceItem {
    id: number;
    device_name: string;
    location_id: number;
    stream_url: string | null;
    is_active: boolean;
}

export interface CameraDeviceCreateRequest {
    device_name: string;
    location_id: number;
    stream_url?: string | null;
}

export interface CameraDeviceUpdateRequest {
    device_name?: string;
    location_id?: number;
    stream_url?: string | null;
    is_active?: boolean;
}
