export interface ResponderCreateRequest {
    first_name: string;
    last_name: string;
    phone_number: string;
}

export interface ResponderUpdateRequest {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
}

export interface ResponderListItem {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    status: string;
    location_id: number;
    has_push_subscription: boolean;
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
