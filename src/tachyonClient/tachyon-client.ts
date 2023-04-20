 type TachyonAuthObject = {
    result : string;
    token_value?: string;
    reason?: string;
};

export class JsonTachyonClient {
    private    ws: WebSocket | undefined;
    constructor(serverUrl: string, user_email: string, user_password: string) {
        this.getToken(serverUrl, user_email, user_password).then( (authObject: TachyonAuthObject) => {
            if (authObject.result === 'success') {
        this.ws = new WebSocket(`ws://${serverUrl}/tachyon/websocket/?token=${authObject.token_value}`);
            }
            else {
                console.log('Error: ' + authObject.reason);
                throw new Error('Error: ' + authObject.reason);
            }
        });
}
 async getToken(serverUrl: string, user_email: string, user_password: string): Promise<TachyonAuthObject> {

        let authResponse: Promise<TachyonAuthObject> = await  fetch(serverUrl + '/teiserver/api/request_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_email: user_email,
                    user_password: user_password
                })
            }).then( response =>   response.json()) as Promise<TachyonAuthObject>;
            return authResponse;

}
    send()
 }
