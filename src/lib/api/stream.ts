import axios from "axios";
import apiClient from "./axiosConfig";
import type { CameraFrameSnapshot } from "../../types/stream";

export const streamAPI = {
    /**
     * Newest camera frame for a site. A 404 means the camera has never
     * sent a frame — callers render a "no feed" placeholder, not an error.
     */
    getLatestFrame: async (
        locationId: number,
    ): Promise<CameraFrameSnapshot | null> => {
        try {
            const res = await apiClient.get("/stream/latest-frame", {
                params: { location_id: locationId },
            });
            return res.data as CameraFrameSnapshot;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    },
};
