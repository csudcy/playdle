import "https://sdk.scdn.co/spotify-player.js"

window.navigator.standalone // https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html

// Check for auth
const token = new URLSearchParams(window.location.hash.substring(1)).get("access_token")
if (token === null) {
    const CLIENT_ID = "49ef02f611cf458e8a5dd8030cb5b7b9";
    const REDIRECT = `${window.location.origin}${window.location.pathname}`;
    const SCOPES = [
        // "app-remote-control",
        "streaming",
        "user-modify-playback-state",
        "user-read-playback-state",
        "user-read-currently-playing",
        // "user-library-modify",
    ];

    window.location.replace(`https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${REDIRECT}&scope=${SCOPES.join(" ")}`)
} else {
    // Remove token from URL
    window.history.pushState({}, "", window.location.pathname)
}

window.onSpotifyWebPlaybackSDKReady = () => {
    // Get control elements
    const addTime = document.querySelector("#addTime")
    const nextTrack = document.querySelector("#nextTrack")
    const progressEnabled = document.querySelector(".progressEnabled")
    const progressPosition = document.querySelector(".progressPosition")
    const revealTrack = document.querySelector("#revealTrack")
    const tooglePlay = document.querySelector("#togglePlay")

    // Get display elements
    const trackArtist = document.querySelector(".trackArtist")
    const trackDuration = document.querySelector("#trackDuration")
    const trackImage = document.querySelector(".trackImage")
    const trackName = document.querySelector(".trackName")
    const trackPosition = document.querySelector("#trackPosition")

    // Game state
    const GAME_STATES = [
        1000,
        2000,
        4000,
        8000,
        16000,
        30000,
    ];
    const MAX_GAME_STATE = GAME_STATES.length - 1;
    const MAX_DURATION = GAME_STATES[MAX_GAME_STATE];
    let game_state = 0;
    let max_duration = 1;
    let track_duration = 1;

    // Init the web player
    const player = new Spotify.Player({name: "Playdle", getOAuthToken: cb => {cb(token)}})

    // Helper methods
    const msToMinSec = (ms) => {
        return `${Math.floor(ms / 60000)}:${Math.floor((ms % 60000) / 1000).toString().padStart(2, "0")}`
    }

    const updateWidth = (element, value) => {
        const done_pc = 100 * value / max_duration;
        element.style.width = `${done_pc}%`;
    }

    const setDuration = (value) => {
        max_duration = value;
        trackDuration.textContent = msToMinSec(value)
    }

    // Bind player events
    player.addListener("ready", ({ device_id }) => {
        fetch(`https://api.spotify.com/v1/me/player?access_token=${token}`,
            {
                body : JSON.stringify(
                    {
                        "device_ids": [device_id],
                        "play": true
                    }
                ),
                method: "PUT"
            }
        );

        setInterval(()=> {
            player.getCurrentState().then(state => {
                if (!state) return;

                trackPosition.textContent = msToMinSec(state.position)
                updateWidth(progressPosition, state.position)

                // Enforce max duration
                if (state.position >= GAME_STATES[game_state]) {
                    player.pause();
                    player.seek(0);
                }
            })
        }, 200)

        // Start the first game!
        nextTrackClick();
    })
    
    player.addListener("not_ready", ({ device_id }) => {
        console.info("Device ID has gone offline", device_id)
    })
    
    player.addListener("initialization_error", ({ message }) => {
        console.error(message)
    })
    
    player.addListener("authentication_error", ({ message }) => {
        console.error(message)
    })
    
    player.addListener("account_error", ({ message }) => {
        console.error(message)
    })
    
    player.addListener("player_state_changed", ({paused, duration, track_window: { current_track }}) => {
        if (paused === true) {
            tooglePlay.className = "play"
        } else {
            tooglePlay.className = "pause"
            trackArtist.textContent = current_track.artists.map(artist => {return artist.name}).join(", ")
            trackName.textContent = current_track["name"]
            trackImage.src = current_track["album"]["images"][2]["url"]
            track_duration = duration;
        }
    })
    player.connect()

    // Bind control events
    tooglePlay.addEventListener("click", () => {
        player.togglePlay()
    })
    
    const nextTrackClick = () => {
        // Hide track info
        trackArtist.style.opacity = '0';
        trackImage.style.opacity = '0';
        trackName.style.opacity = '0';

        // Move to next track
        player.nextTrack().then(() => {
            // Reset game state
            game_state = 0;
            setDuration(MAX_DURATION);
            updateWidth(progressEnabled, GAME_STATES[game_state])
        })
    }
    nextTrack.addEventListener("click", nextTrackClick);

    const playFromStart = () => {
        player.getCurrentState().then(state => {
            if (state && state.paused) {
                player.seek(0);
                player.togglePlay();
            }
        })
    }

    addTime.addEventListener("click", () => {
        game_state += 1;
        if (!GAME_STATES[game_state]) {
            game_state = MAX_GAME_STATE;
        }
        updateWidth(progressEnabled, GAME_STATES[game_state])

        playFromStart();
    })

    revealTrack.addEventListener("click", () => {
        game_state = MAX_GAME_STATE + 1;
        setDuration(track_duration);
        updateWidth(progressEnabled, track_duration);
        trackArtist.style.opacity = '';
        trackImage.style.opacity = '';
        trackName.style.opacity = '';

        playFromStart();
    })
}