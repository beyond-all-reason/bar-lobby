/**
 * Alerts are used to display simple messages.
 * Notifications are typically for generic messages, such as server announcements or expected errors.
 * Events are for more user-specific events that are interactive, such as party invites or direct messages.
 * For central and blocking alerts, use <Modal>
 */

export type Alert = {
    type: "notification" | "event";
    content: string;
    /** pass 0 for sticky */
    timeoutMs?: number;
    id?: string;
};

export type NotificationAlert = Alert & {
    type: "notification";
    severity?: "error" | "warning";
};

export type EventAlert = Alert & {
    type: "event";
    action: () => void;
};
