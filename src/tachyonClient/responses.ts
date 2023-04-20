export type TachyonResponseCommand = typeof TachyonResponseCommands[number];

const TachyonResponseCommands = [
    "s.matchmaking.get_queue_info",
    "s.matchmaking.query",
    "s.matchmaking.join_queue",
    "s.matchmaking.leave_queue",
    "s.matchmaking.leave_all_queues",
    "s.matchmaking.accept",
    "s.matchmaking.reject",
    "s.matchmaking.cancel",
    "s.matchmaking.cancel_all",

]