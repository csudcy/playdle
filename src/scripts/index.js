import "https://sdk.scdn.co/spotify-player.js"

window.navigator.standalone // https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html

// Get control elements
const addTime = document.querySelector("#addTime")
const nextTrack = document.querySelector("#nextTrack")
const revealTrack = document.querySelector("#revealTrack")
const Slider = document.querySelector(".time_update input[type=range]")
const tooglePlay = document.querySelector("#togglePlay")

// Get display elements
const trackArtist = document.querySelector(".trackArtist")
const trackDuration = document.querySelector("#trackDuration")
const trackImage = document.querySelector(".trackImage")
const trackName = document.querySelector(".trackName")
const trackPosition = document.querySelector("#trackPosition")

// Check for auth
const token = new URLSearchParams(window.location.hash.substring(1)).get("access_token")
if (token === null) {
    const CLIENT_ID = "49ef02f611cf458e8a5dd8030cb5b7b9";
    const REDIRECT = "http://localhost:8000/";
    const SCOPES = [
        // "app-remote-control",
        "streaming",
        "user-modify-playback-state",
        "user-read-playback-state",
        "user-read-currently-playing",
        // "user-library-modify",
    ];

    window.location.replace(`https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${REDIRECT}&show_dialog=true&scope=${SCOPES.join(" ")}`)
// TODO: Store token to local storage? Only valid for an hour so only really useful for dev...
// } else {
//     window.history.pushState({}, "", "/")
}

const msToMinSec = (ms) => {
    return `${Math.floor(ms / 60000)}:${Math.floor((ms % 60000) / 1000).toString().padStart(2, "0")}`
}

window.onSpotifyWebPlaybackSDKReady = () => {
    const player = new Spotify.Player({name: "Playdle", getOAuthToken: cb => {cb(token)}})

    const GAME_STATES = [
        1,
        2,
        4,
        8,
        16,
        30,
    ];
    const MAX_GAME_STATE = GAME_STATES.length - 1;
    let game_state = 0;
    
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
                Slider.value = state.position

                if (!state.paused) {
                    // Check game state
                    const max_duration = GAME_STATES[game_state];
                    if (max_duration !== null) {
                        // Enfore max duration
                        if (state.position >= max_duration * 1000) {
                            player.pause();
                            player.seek(0);
                        }
                    }
                }
            })
        }, 200)
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
            Slider.setAttribute("max", duration)
            trackDuration.textContent = msToMinSec(duration)
        }
        
    })
    player.connect()

    // Bind control events
    tooglePlay.addEventListener("click", () => {
        player.togglePlay()
    })
    
    nextTrack.addEventListener("click", () => {
        // Reset game state & hide track info
        game_state = 0;
        trackArtist.style.display = 'none';
        trackImage.style.display = 'none';
        trackName.style.display = 'none';

        // Move to next track
        player.nextTrack()
    })

    Slider.addEventListener("change", () => {
        trackPosition.textContent = msToMinSec(Slider.value);player.seek(Slider.value)
    })

    const playFromStart = () => {
        player.getCurrentState().then(state => {
            if (!state) return;

            if (state.paused) {
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

        playFromStart();
    })

    revealTrack.addEventListener("click", () => {
        game_state = MAX_GAME_STATE + 1;
        trackArtist.style.display = '';
        trackImage.style.display = '';
        trackName.style.display = '';

        playFromStart();
    })
}