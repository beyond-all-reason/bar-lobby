export type MatchId = string;
export type QueueId = number;
export type MatchmakingQuery = any; //TODO: what does a query look like?
export type Queue = {
    queue_id: QueueId;
    name: string;
    mean_wait_time: number;
    group_count: number;
};