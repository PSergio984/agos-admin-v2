import type { DeviceDetails, LocationDetails } from "../../types/core";

import apiClient from "./axiosConfig";

export const coreAPI = {
    getLocationDetails: async (): Promise<LocationDetails> => {
        const res = await apiClient.get("/core/location-details");
        return res.data as LocationDetails;
    },

    getDeviceDetails: async (locationId?: number): Promise<DeviceDetails> => {
        const res = await apiClient.get("/core/device-details", {
            params: locationId ? { location_id: locationId } : undefined,
        });
        return res.data as DeviceDetails;
    },
};
