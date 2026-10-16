import type {
    ResponderActiveSiteResponse,
    ResponderCreateRequest,
    ResponderDeploymentCreateRequest,
    ResponderDeploymentItem,
    ResponderDeploymentsResponse,
    ResponderUpdateRequest,
    ResponderAdditionalDetails,
    ResponderListItem,
} from "../../types/responder";
import apiClient from "./axiosConfig";

export const responderAPI = {
    bulkCreateResponders: async (
        responders: ResponderCreateRequest[],
    ): Promise<ResponderListItem[]> => {
        try {
            const res = await apiClient.post("/responders/bulk", responders, {
                timeout: 60000, // 60 seconds for bulk operations
            });
            return res.data as ResponderListItem[];
        } catch (error) {
            throw error;
        }
    },

    getAllResponders: async (): Promise<ResponderListItem[]> => {
        try {
            const res = await apiClient.get("/responders/all");
            return res.data as ResponderListItem[];
        } catch (error) {
            throw error;
        }
    },

    getResponderDetails: async (
        responderId: string,
    ): Promise<ResponderAdditionalDetails> => {
        try {
            const res = await apiClient.get(
                `/responders/additional-details/${responderId}`,
            );
            return res.data as ResponderAdditionalDetails;
        } catch (error) {
            throw error;
        }
    },

    updateResponder: async (
        responderId: string,
        payload: ResponderUpdateRequest,
    ): Promise<ResponderListItem> => {
        const res = await apiClient.patch(
            `/responders/${responderId}`,
            payload,
        );
        return res.data as ResponderListItem;
    },

    getDeployments: async (
        responderId: string,
    ): Promise<ResponderDeploymentsResponse> => {
        const res = await apiClient.get(
            `/responders/${responderId}/deployments`,
        );
        return res.data as ResponderDeploymentsResponse;
    },

    openDeployment: async (
        responderId: string,
        payload: ResponderDeploymentCreateRequest,
    ): Promise<ResponderDeploymentItem> => {
        const res = await apiClient.post(
            `/responders/${responderId}/deployments`,
            payload,
        );
        return res.data as ResponderDeploymentItem;
    },

    closeDeployment: async (
        responderId: string,
        deploymentId: number,
    ): Promise<ResponderDeploymentItem> => {
        const res = await apiClient.post(
            `/responders/${responderId}/deployments/${deploymentId}/close`,
        );
        return res.data as ResponderDeploymentItem;
    },

    setActiveSite: async (
        responderId: string,
        locationId: number | null,
    ): Promise<ResponderActiveSiteResponse> => {
        const res = await apiClient.put(
            `/responders/${responderId}/active-site`,
            { location_id: locationId },
        );
        return res.data as ResponderActiveSiteResponse;
    },

    downloadTemplate: async (): Promise<void> => {
        const res = await apiClient.get("/responders/template", {
            responseType: "blob",
        });
        const blob = new Blob([res.data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "responder_template.xlsx";
        link.click();
        window.URL.revokeObjectURL(url);
    },
};
