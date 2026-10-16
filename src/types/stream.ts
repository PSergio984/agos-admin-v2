// Matches GET /stream/latest-frame and the `camera_update` WS payload.
export interface CameraFrameSnapshot {
    image: string;
    timestamp: string;
}
