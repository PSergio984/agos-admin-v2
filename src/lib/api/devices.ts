import apiClient from "./axiosConfig";
import type {
    CameraDeviceCreateRequest,
    CameraDeviceItem,
    CameraDeviceUpdateRequest,
    SensorDeviceCreateRequest,
    SensorDeviceItem,
    SensorDeviceUpdateRequest,
} from "../../types/devices";

export const sensorDevicesAPI = {
    list: async (locationId?: number): Promise<SensorDeviceItem[]> => {
        const res = await apiClient.get("/sensor-devices", {
            params:
                locationId !== undefined ? { location_id: locationId } : {},
        });
        return res.data as SensorDeviceItem[];
    },

    create: async (
        payload: SensorDeviceCreateRequest,
    ): Promise<SensorDeviceItem> => {
        const res = await apiClient.post("/sensor-devices", payload);
        return res.data as SensorDeviceItem;
    },

    update: async (
        deviceId: number,
        payload: SensorDeviceUpdateRequest,
    ): Promise<SensorDeviceItem> => {
        const res = await apiClient.put(`/sensor-devices/${deviceId}`, payload);
        return res.data as SensorDeviceItem;
    },
};

export const cameraDevicesAPI = {
    list: async (locationId?: number): Promise<CameraDeviceItem[]> => {
        const res = await apiClient.get("/camera-devices", {
            params:
                locationId !== undefined ? { location_id: locationId } : {},
        });
        return res.data as CameraDeviceItem[];
    },

    create: async (
        payload: CameraDeviceCreateRequest,
    ): Promise<CameraDeviceItem> => {
        const res = await apiClient.post("/camera-devices", payload);
        return res.data as CameraDeviceItem;
    },

    update: async (
        deviceId: number,
        payload: CameraDeviceUpdateRequest,
    ): Promise<CameraDeviceItem> => {
        const res = await apiClient.put(`/camera-devices/${deviceId}`, payload);
        return res.data as CameraDeviceItem;
    },
};
