/**
 * If, for some reason, online functions like auth
 * can't be used, enable offline mode to bypass errors produced
 * by disabling authentication
 * 
 * Note: Make sure to disable the auth middleware on each page
 */
const OFFLINE_MODE = false;

import jwt from "jsonwebtoken";
import MongoInstance from "./mongo";
const db = new MongoInstance();
db.awaitConnect();

const signingPub = `-----BEGIN CERTIFICATE-----
MIIDDTCCAfWgAwIBAgIJQTkfWiJ+ANFEMA0GCSqGSIb3DQEBCwUAMCQxIjAgBgNV
BAMTGXF1YW50dW0tYXV0aC51cy5hdXRoMC5jb20wHhcNMjIwNzA0MDUyMDA0WhcN
MzYwMzEyMDUyMDA0WjAkMSIwIAYDVQQDExlxdWFudHVtLWF1dGgudXMuYXV0aDAu
Y29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn3xdCxWFPH3ur2vL
CuRvDDjdBBvfyBWc+A10DwgwPpy7THdWGAOW0i/W9VWmk+7Iq1qtovzw+tD7O/Ed
UzMLL7NzM4h1S1xRpyHxJIDIBwvyVNy4TIsrLswZyYonDhCZDUI9pntmIx1EZeCF
8i66fLy+Tq2FRY7C6tm0HFfktfPpe2j8u44FLOM36r9yBMZGtb9BsypAP0pRtLM3
LfUkEyhCF6cBYS3f0Uhab7MfPscGgul+nSfrUrAyTt5Mh7RnHY2P6DmHB8LtzTwD
39jv6vDaLi34tmGLXa1SvsIdYeDkHdRqnEjWkHrRbK2/i3lAFKazNPl+TJPvrM0b
60blNQIDAQABo0IwQDAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBSDAJ6mg4iP
+0NiK4z1jC88rAafQjAOBgNVHQ8BAf8EBAMCAoQwDQYJKoZIhvcNAQELBQADggEB
AFK8Ki1FfQMMNMNtOK3vh2aCNdiGAPrz6+WpzsFJV9x2GUQaEz2VpG3tt+FQsqFR
BvcxUrQ6/enMmaslwBjkQ4Z8K9QChm2vnj+fhWRam5184KuNq7vX4ZEAEqhOWudB
Dw4LXSdHn0J2H4H2CTobt6eye3i46UNvGNVpvD8jiypzarBjzTh8ij9fxSYcEIq9
X6O9hoo1jqhBzZOyOJqJsyhdKgln+US89GWOze59AL5owsKh9GZIwqdYJRk/xdfY
qVurtuxG/HRoSHlq5etHqOD/tskWk8wWD5Cc+gJK4r9oZV5jUhVE1YHJB1f+IFg5
5uP5223RPkss5H7edWZOuAA=
-----END CERTIFICATE-----`

function authenticate(socket) {
    if (OFFLINE_MODE) return true;

    const cookie = socket.handshake.headers.cookie;
    try {
        if (cookie) {
            const split = cookie.split(";");
    
            if (split.length > 0) {
                const find = split.find(part => part.trim().startsWith("auth._token.auth0"));
    
                if (find) {
                    const rel = find.split("=");
                    
                    const res = jwt.verify(rel[1].substring(9), signingPub, {algorithm: "RS256"})
                    return res.iss === "https://quantum-auth.us.auth0.com/"
                    //If we made it here, the token is valid
                    //(jwt produces errors if invalid)
                }
            }
        }
        return false;
    } catch(e) {
        return false;
    }
}

export default function Svc(socket, io) {
    return {
        //----SCENE DATA SOCKET----
        async currentDisplayEvent(payload) {
            if (!authenticate(socket)) {
                socket.disconnect(true);
                return
            };

            io.emit("currentDisplayEvent", payload);
        },

        async setActiveDisplays(payload) {
            if (!authenticate(socket)) {
                socket.disconnect(true);
                return;
            };

            if (!payload) return;

            const res = await db.displayDataFunctions.setActiveDisplays({
                current: payload.current, 
                pending: payload.pending
            });

            if (res) {
                io.emit("activeDisplaysUpdate", res)
            }
        },

        async getActiveDisplays(cb) {
            try {
                if (cb) {
                    const res = await db.displayDataFunctions.getActiveDisplays();
                        
                    if (res) {
                        cb(res);
                    }
                }            
            } catch(e) {
                //
            }
        },

        async getAllKnownDisplays(cb) {
            try {
                if (cb) {
                    const res = await db.displayDataFunctions.getAllKnownDisplays();

                    if (res) {
                        cb(res);
                    }
                }
            } catch(e) {
                //
            }
        },

        async getValidScenes(cb) {
            try {
                if (cb) {
                    const res = await db.displayDataFunctions.getValidScenes();

                    if (res) {
                        cb(res);
                    }
                }            
            } catch(e) {
                //
            }
        },

        async getValidGames(cb) {
            try {
                if (cb) {
                    const res = await db.displayDataFunctions.getValidGames();

                    if (res) {
                        cb(res);
                    }
                }
            } catch(e) {
                //
            }
        },

        async getGamesInUse(cb) {
            try {
                if (cb) {
                    const res = await db.displayDataFunctions.getGamesInUse();

                    if (res) {
                        cb(res);
                    }
                }
            } catch(e) {
                //
            }
        },

        async setGamesInUse(games) {
            if (!authenticate(socket)) {
                socket.disconnect(true);
                return;
            };

            if (Array.isArray(games)) {
                const res = await db.displayDataFunctions.setGamesInUse(games);

                if (res) {
                    io.emit("gamesInUseUpdate", res);
                }

            }
        },
        //----End SCENE DATA----

        //----PLAYER SOCKETS----
        async setTeams(payload) {
            /*
             * Expected Payload:
             *  {
             *      teams: [
             *          {
             *              players: string[],
             *              teamName: string
             *          },
             *          ...
             *      ],
             *      resetScores: boolean
             *  }
             */

            if (!authenticate(socket)) {
                socket.disconnect(true);
                return;
            }

            if (Array.isArray(payload.teams)) {
                const res = await db.teamDataFunctions.setTeams(payload.teams, payload.resetScores);

                if (res) {
                    io.emit("teamsUpdate", res)
                }
            }
        },

        async resetPlayerPoints() {
            if (!authenticate(socket)) {
                socket.disconnect(true);
                return;
            };

            const res = await db.teamDataFunctions.reset(true);

            if (res) {
                io.emit("teamsUpdate", res)
            }
        },

        async addPlayerPoints(payload) {
            if (!authenticate(socket)) {
                socket.disconnect(true);
                return;
            };

            if (payload && 
                payload.points && 
                typeof payload.points === "number" &&
                typeof payload.teamIndex === "number" && 
                typeof payload.playerIndex === "number"
            ) {
                const res = await db.teamDataFunctions.addPlayerPoints(
                    payload.playerIndex,
                    payload.teamIndex,
                    payload.points
                )

                if (res) {
                    io.emit("teamsUpdate", res)
                }
            }
        },

        async getTeamsData(cb) {
            try {
                if (cb) {
                    const res = await db.teamDataFunctions.getTeamData();

                    if (res) cb(res);
                }
            } catch(e) {
                //
            }
        },
        //----END PLAYER SOCKETS----

        //----WHEEL SOCKETS----
        async setWheelOptions(options) {
            if (!authenticate(socket)) {
                socket.disconnect(true);
                return;
            };

            if (Array.isArray(options)) {
                const res = await db.wheelDataFunctions.setWheelOptions(options);

                if (res) {
                    io.emit("wheelUpdate", res)
                }
            }
        },

        async getWheelOptions(cb) {
            try {
                if (cb) {
                    const res = await db.wheelDataFunctions.getWheelOptions();

                    if (res) cb(res);
                }
            } catch(e) {
                //
            }
        }
        //----END WHEEL SOCKETS----
    }
}