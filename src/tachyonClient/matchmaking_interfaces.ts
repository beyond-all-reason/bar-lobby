import { TachyonMessage } from "./tachyon-client";
interface Queue {
  queue_id: number;
  name: string;
  mean_wait_time: number;
  group_count: number;
}
interface get_queue_info extends TachyonMessage {
    cmd: "c.matchmaking.get_queue_info";
 queue_id: number;
}
//TODO: what does a query look like?
interface matchmaking_query extends TachyonMessage {
    cmd : "c.matchmaking.query";
    query: any;
}
interface JoinQueueRequest extends TachyonMessage {
  cmd: "c.matchmaking.join_queue";
  queue_id: number;
}
interface LeaveQueueRequest extends TachyonMessage {
  cmd: "c.matchmaking.leave_queue";
  queue_id: number;
}
 interface MatchmakingAcceptRequest extends TachyonMessage{
  cmd: "c.matchmaking.accept";
  match_id: string;
}
 interface MatchmakingLeaveQueueRequest extends TachyonMessage {
  queue_id: number;
}