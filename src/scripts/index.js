import "https://sdk.scdn.co/spotify-player.js"

window.navigator.standalone // https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html

const tooglePlay = document.querySelector("#togglePlay")
const Slider = document.querySelector(".time_update input[type=range]")
const nextTrack = document.querySelector("#nextTrack")
const previousTrack = document.querySelector("#previousTrack")
const image = document.querySelector(".t_art")
const Name = document.querySelector(".t_name")
const total_duration = document.querySelector("#ttl")
const current_duration = document.querySelector("#cur")
const likeTrack = document.querySelector("#likeTrack")
const track_artists = document.querySelector(".t_artists")
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
// } else {
//     window.history.pushState({}, "", "/")
}

const msToMinSec = (ms) => {
    return `${Math.floor(ms / 60000)}:${Math.floor((ms % 60000) / 1000).toString().padStart(2, "0")}`
}

const put_player = (uri) => {
    fetch(`https://api.spotify.com/v1/me/player/play?access_token=${token}`,
        {
            body : JSON.stringify(
                {
                    uris: [uri]
                }
            ),
            method: "PUT"
        }
    )
}

window.onSpotifyWebPlaybackSDKReady = () => {
    const player = new Spotify.Player({name: "MySpotify", getOAuthToken: cb => {cb(token)}})
    
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
        )
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
    
    tooglePlay.addEventListener("click", () => {
        player.togglePlay()
    })
    
    nextTrack.addEventListener("click", () => {
        player.nextTrack()
    })

    previousTrack.addEventListener("click",() => {
        player.previousTrack()
    })

    Slider.addEventListener("change", () => {
        current_duration.textContent = msToMinSec(Slider.value);player.seek(Slider.value)
    })

    likeTrack.addEventListener("click", () => {
        player.getCurrentState().then(res => {
            if (likeTrack.getAttribute("liked") == "true") {
                fetch(`https://api.spotify.com/v1/me/tracks?ids=${res.track_window.current_track.id}`,
                    {
                        method : "DELETE",
                        headers : {
                            "Accept" : "application/json",
                            "Content-Type" : "application/json",
                            "Authorization" : `Bearer ${token}`
                        }
                    }).finally(
                        likeTrack.setAttribute("liked", "false")
                    )
            }
            else {
                fetch(`https://api.spotify.com/v1/me/tracks?ids=${res.track_window.current_track.id}`,
                    {
                        method : "PUT",
                        headers : {
                            "Accept" : "application/json",
                            "Content-Type" : "application/json",
                            "Authorization" : `Bearer ${token}`
                        }
                    }).finally(
                        likeTrack.setAttribute("liked", "true")
                    )
                }
            })
        })
    
    player.addListener("player_state_changed", ({paused, duration, track_window: { current_track }}) => {
        fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${current_track.id}`,
            {
                method : "GET",
                headers : {
                    "Accept" : "application/json",
                    "Content-Type" : "application/json",
                    "Authorization" : `Bearer ${token}`
                }
            }
        ).then(chunk => chunk.json()).then(res => {
            if (res[0] === false) likeTrack.setAttribute("liked", "false")
            else likeTrack.setAttribute("liked", "true")
        })

        if (paused === true) tooglePlay.className = "play"
        else {
            tooglePlay.className = "pause"
            track_artists.textContent = current_track.artists.map(artist => {return artist.name}).join(", ")
            Name.textContent = current_track["name"]
            image.src = current_track["album"]["images"][2]["url"]
            Slider.setAttribute("max", duration)
            total_duration.textContent = msToMinSec(duration)
        }
        
        setInterval(()=> {
            player.getCurrentState().then(state => {
                current_duration.textContent = msToMinSec(state.position)
            })
        }, 1000)

        setInterval(()=> {
            player.getCurrentState().then(state => {
                Slider.value = state.position
            })
        }, 5000)
    })
    player.connect()
}