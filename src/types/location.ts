export interface LocationItem {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    is_active: boolean;
}

export interface LocationCreateRequest {
    name: string;
    latitude: number;
    longitude: number;
}

export interface LocationUpdateRequest {
    name?: string;
    latitude?: number;
    longitude?: number;
    is_active?: boolean;
}
