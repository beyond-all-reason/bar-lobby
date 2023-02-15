/**
 * Alerts are for displaying informative messages to the user, but aren't directly tied to any expected action.
 * They should typically be displayed at times when the user is using the lobby, and will notice them naturally.
 *
 * Examples:
 * - announcement of upcoming server downtime
 * - kicked from a battle
 */
export type Alert = {
    id: string;
    text: string;
    timeoutMs?: number;
    severity?: "info" | "warning" | "error";
};

/**
 * Events are for important, usually interactive notifications, and will commonly occur when the lobby is minimized, so
 *  by default they will flash the app icon and play a sound.
 *
 * Examples:
 * - invited to a party
 * - !ring
 */
export type Event = {
    id: string;
    text: string;
    timeoutMs?: number;
    action: () => void;
};
