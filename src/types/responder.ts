export interface ResponderCreateRequest {
    first_name: string;
    last_name: string;
    phone_number: string;
    // Home site — required by the multi-site backend.
    location_id: number;
}

export interface ResponderUpdateRequest {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    // Home-site reassignment — must be an existing active site.
    location_id?: number;
}

export interface ResponderListItem {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    status: string;
    // Home site.
    location_id: number;
    has_push_subscription: boolean;
}

export interface ResponderDeploymentItem {
    id: number;
    location_id: number;
    location_name: string;
    starts_at: string;
    ends_at: string | null;
    planned_ends_at: string | null;
    created_by: string;
}

export interface ResponderDeploymentsResponse {
    home_location_id: number;
    home_location_name: string;
    active_location_id: number | null;
    deployments: ResponderDeploymentItem[];
}

export interface ResponderDeploymentCreateRequest {
    location_id: number;
    starts_at?: string;
    planned_ends_at?: string;
}

export interface ResponderActiveSiteResponse {
    location_id: number;
    active_location_id: number | null;
}

export interface ResponderAdditionalDetails {
    created_at: string;
    created_by: string;
    activated_at: string | null;
}

export interface ResponderAllDetails
    extends ResponderListItem, ResponderAdditionalDetails {}

export type NotificationType =
    | "critical"
    | "warning"
    | "blockage"
    | "announcement";

export interface NotificationTemplate {
    id: number;
    type: NotificationType;
    title: string;
    message: string;
}

export interface NotificationTemplateCreateRequest {
    type: NotificationType;
    title: string;
    message: string;
}

export interface ResponderGroup extends ResponderGroupCreateRequest {
    id: number;
}

export interface ResponderGroupCreateRequest {
    group_name: string;
    member_ids: string[];
}

export interface CustomNotificationRequest {
    title: string;
    message: string;
    type: NotificationType;
}

export interface SendNotificationRequest {
    responder_ids: string[];
    template_id: number | null;
    custom_notification: CustomNotificationRequest | null;
}
