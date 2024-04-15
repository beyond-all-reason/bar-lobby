export type SteamSessionTicketResponse = {
    response: {
        params:
            | {
                  result: "OK";
                  steamid: string;
                  ownersteamid: string;
                  vacbanned: boolean;
                  publisherbanned: boolean;
              }
            | {
                  error:
                      | { errorcode: 3; errordesc: "Invalid parameter" }
                      | { errorcode: 101; errordesc: "Invalid ticket" }
                      | { errorcode: number; errordesc: string };
              };
    };
};
