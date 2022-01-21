import { ref } from "vue";

type LoginRequest = (Parameters<typeof window.api.client.login>)[0];

export async function loginRequest(loginRequest: LoginRequest) {
    const loginResponse = await window.api.client.login(loginRequest);

    if (loginResponse.result === "success" && loginResponse.user) {
        if (loginResponse.user) {
            window.api.session.account = ref({
                id: loginResponse.user.id,
                springid: loginResponse.user.springid,
                name: loginResponse.user.name,
                bot: loginResponse.user.bot,
                clan_id: loginResponse.user.clan_id,
                friends: loginResponse.user.friends,
                friend_requests: loginResponse.user.friend_requests,
            });
        }
    }

    return loginResponse;
}