import { createMessageHandlers } from "@/model/messages";

export const messageHandlers = createMessageHandlers(
    {
        regex: new RegExp(/!vote/),
        async handler(data, message) {
            message.hide = true;
        },
    },
    {
        regex: new RegExp(/!joinas/),
        async handler(data, message) {
            message.hide = true;
        },
    }
);
