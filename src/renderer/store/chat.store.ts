import { reactive } from "vue";

export interface ChatRoom {
    id: string;
    name: string;
    color: string;
    messages: ChatMessage[];
    unreadMessages: number;
    closeable: boolean;
}

export interface ChatMessage {
    userId: string;
    userName: string;
    text: string;
    timestamp: number;
}

export enum WellKnownChatRooms {
    General = "general",
    Lobby = "lobby",
}

const defaultChatRooms: ChatRoom[] = [
    {
        id: WellKnownChatRooms.General,
        name: "General",
        color: "#87ceeb",
        messages: [
            {
                userId: "System",
                userName: "System",
                text: "Welcome to the chat!",
                timestamp: Date.now(),
            },
        ],
        unreadMessages: 0,
        closeable: false,
    },
    {
        id: WellKnownChatRooms.Lobby,
        name: "Lobby",
        color: "#87ceeb",
        messages: [
            {
                userId: "System",
                userName: "System",
                text: "Welcome to the lobby!",
                timestamp: Date.now(),
            },
            {
                userId: "System",
                userName: "System",
                text: "This is a place to chat with other players.",
                timestamp: Date.now(),
            },
            {
                userId: "System",
                userName: "System",
                text: "Please be respectful and follow the rules.",
                timestamp: Date.now(),
            },
            {
                userId: "System",
                userName: "System",
                text: "Enjoy your stay!",
                timestamp: Date.now(),
            },
        ],
        unreadMessages: 4,
        closeable: false,
    },
    {
        id: "101",
        name: "Melon",
        color: "#ff6347",
        messages: [
            {
                userId: "101",
                userName: "Melon",
                text: "Welcome to the Melon chat!",
                timestamp: Date.now(),
            },
        ],
        unreadMessages: 1,
        closeable: true,
    },
];

export const chatStore = reactive<{
    chatRooms: ChatRoom[];
    selectedChatRoom: ChatRoom;
}>({
    chatRooms: defaultChatRooms,
    selectedChatRoom: defaultChatRooms.at(0),
});

export const chatActions = {
    selectChatRoom(id: string) {
        chatStore.selectedChatRoom = chatStore.chatRooms.find((room) => room.id === id);
        chatStore.selectedChatRoom.unreadMessages = 0;
    },
    sendMessage(message: ChatMessage) {
        chatStore.selectedChatRoom.messages.push(message);
    },
    addMessage(roomId: string, message: ChatMessage) {
        const room = chatStore.chatRooms.find((room) => room.id === roomId);
        if (room) {
            room.messages.push(message);
            if (chatStore.selectedChatRoom.id !== roomId) {
                room.unreadMessages++;
            }
        }
    },
    closeChatRoom(id: string) {
        chatStore.chatRooms = chatStore.chatRooms.filter((room) => room.id !== id);
    },
    openChatRoom(room: ChatRoom) {
        chatStore.chatRooms.push(room);
    },
};
