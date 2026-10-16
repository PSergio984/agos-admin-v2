import type {
    LocationItem,
    LocationCreateRequest,
    LocationUpdateRequest,
} from "../../types/location";
import apiClient from "./axiosConfig";

export const locationsAPI = {
    listSites: async (includeInactive = false): Promise<LocationItem[]> => {
        const res = await apiClient.get("/locations", {
            params: { include_inactive: includeInactive },
        });
        return res.data as LocationItem[];
    },

    createSite: async (payload: LocationCreateRequest): Promise<LocationItem> => {
        const res = await apiClient.post("/locations", payload);
        return res.data as LocationItem;
    },

    updateSite: async (
        locationId: number,
        payload: LocationUpdateRequest,
    ): Promise<LocationItem> => {
        const res = await apiClient.put(`/locations/${locationId}`, payload);
        return res.data as LocationItem;
    },
};
