import { TachyonMessage } from "../tachyon-client";

function MatchReady(message :MatchReadyMessage){
    console.log("MatchReady");
    console.log(message);
}
interface MatchReadyMessage extends TachyonMessage {
    cmd: "s.matchmaking.match_ready"
    match_id: string;
}