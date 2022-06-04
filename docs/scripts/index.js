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
    // Get player control elements
    const addTime = document.querySelector("#addTime")
    const nextTrack = document.querySelector("#nextTrack")
    const playlistSelect = document.querySelector(".playlistSelect")
    const progressEnabled = document.querySelector("#progressEnabled")
    const progressPosition = document.querySelector("#progressPosition")
    const revealTrack = document.querySelector("#revealTrack")
    const togglePlay = document.querySelector("#togglePlay")

    // Get player display elements
    const playlistName = document.querySelector("#playlistName")
    const trackArtist = document.querySelector("#trackArtist")
    const trackDuration = document.querySelector("#trackDuration")
    const trackImage = document.querySelector("#trackImage")
    const trackName = document.querySelector("#trackName")
    const trackPosition = document.querySelector("#trackPosition")

    // Get search elements
    const searchAlbum = document.querySelector("#searchAlbum")
    const searchClose = document.querySelector("#searchClose")
    const searchInput = document.querySelector("#searchInput")
    const searchPlaylist = document.querySelector("#searchPlaylist")
    const searchResults = document.querySelector("#searchResults")
    const searchTitle = document.querySelector("#searchTitle")

    // Get screen elements
    const loadingScreen = document.querySelector("#loadingScreen")
    const playerScreen = document.querySelector("#playerScreen")
    const searchScreen = document.querySelector("#searchScreen")

    // Game state
    const GAME_STATES = [
        0,
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

    const searchTypeAlbum = "album";
    const searchTypePlaylist = "playlist";

    // Init the APIs
    const player = new Spotify.Player({name: "Playdle", getOAuthToken: cb => {cb(token)}})
    const spotifyApi = new SpotifyWebApi();
    spotifyApi.setAccessToken(token);

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

    const setGameState = (new_game_state) => {
        game_state = new_game_state;

        // Update addTime enabled state
        if (game_state >= MAX_GAME_STATE) {
            addTime.classList.remove("enabled");
        } else {
            addTime.classList.add("enabled");
        }

        if (game_state > MAX_GAME_STATE) {
            // Game is over
            setDuration(track_duration);
            updateWidth(progressEnabled, track_duration);

            trackArtist.style.opacity = '';
            trackImage.style.opacity = '';
            trackName.style.opacity = '';
        } else {
            setDuration(MAX_DURATION);
            updateWidth(progressEnabled, GAME_STATES[game_state])

            trackArtist.style.opacity = '0';
            trackImage.style.opacity = '0';
            trackName.style.opacity = '0';
        }
    }
    
    const playFromStart = () => {
        player.getCurrentState().then(state => {
            if (state && state.paused) {
                player.seek(0)
                player.resume();
            }
        })
    }

    const showScreen = (screen) => {
        loadingScreen.style.display = screen == loadingScreen ? '' : 'none';
        playerScreen.style.display = screen == playerScreen ? '' : 'none';
        searchScreen.style.display = screen == searchScreen ? '' : 'none';
    };

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
                if (game_state > 0 && state.position >= GAME_STATES[game_state]) {
                    player.pause();
                    player.seek(0);
                }
            })
        }, 200)

        // Show the game screen
        setGameState(0);
        showScreen(playerScreen);
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
    
    player.addListener("player_state_changed", (state) => {
        if (state.paused === true) {
            togglePlay.classList.remove('fa-pause');
            togglePlay.classList.add('fa-play');
        } else {
            togglePlay.classList.remove('fa-play');
            togglePlay.classList.add('fa-pause');

            const current_track = state.track_window.current_track;

            if (trackName.textContent !== current_track.name) {
                // Populate track data
                trackArtist.textContent = current_track.artists.map(artist => {return artist.name}).join(", ")
                trackName.textContent = current_track.name
                trackImage.src = current_track.album.images[2].url
                track_duration = state.duration;
                playlistName.textContent = state.context.metadata.name

                // Start game
                setGameState(1);
            }
        }
    })
    player.connect()

    // Bind control events
    togglePlay.addEventListener("click", () => {
        player.togglePlay()
    })

    nextTrack.addEventListener("click", () => {
        setGameState(0);
        player.nextTrack();
    });

    addTime.addEventListener("click", () => {
        if (game_state < MAX_GAME_STATE) {
            setGameState(game_state + 1);
            playFromStart();
        }
    })

    revealTrack.addEventListener("click", () => {
        setGameState(MAX_GAME_STATE + 1);
        playFromStart();
    })

    playlistSelect.addEventListener("click", () => {
        showScreen(searchScreen);
    })

    searchAlbum.addEventListener("click", () => {
        search(searchTypeAlbum);
    })

    searchClose.addEventListener("click", () => {
        showScreen(playerScreen);
    })

    searchPlaylist.addEventListener("click", () => {
        search(searchTypePlaylist);
    })

    searchResults.addEventListener("click", (event) => {
        let element = event.target;
        while (!element.dataset.uri) {
            element = element.parentNode;
        }
        const uri = element.dataset.uri;
        spotifyApi.play({"context_uri": uri}).then(() => {
            spotifyApi.setShuffle(true);
        });

        showScreen(playerScreen);
    })

    const search = (searchType) => {
        const query = searchInput.value;
        if (!query) return;

        if (searchType == searchTypeAlbum) {
            searchAlbum.classList.add("selected");
            searchPlaylist.classList.remove("selected");
        } else {
            searchAlbum.classList.remove("selected");
            searchPlaylist.classList.add("selected");
        }

        searchTitle.textContent = `"${query}"`;
        searchResults.innerHTML = '<i class="fa-solid fa-hourglass-empty"></i>';
        searchTitle.style.opacity = 1;
        searchResults.style.opacity = 1;
        spotifyApi.search(query, [searchType]).then((response) => {
            const results = response[`${searchType}s`];
            if (results.items.length == 0) {
                searchResults.textContent = "No results!";
            } else {
                const resultRows = results.items.map((item) => {
                    let creator;
                    if (item.owner) {
                        creator = item.owner.display_name;
                    } else {
                        creator = item.artists.map(artist => {return artist.name}).join(", ");
                    }
                    const image = item.images[item.images.length - 1].url;
                    return `<div class="button solid enabled row" data-uri="${item.uri}">
                        <img src="${image}"/>
                        <span style="flex-grow: 1;">
                            <h3>${item.name}</h3>
                            by ${creator}
                        <span>
                    </div>`;
                });
                searchResults.innerHTML = resultRows.join("\n");
            }
        })
    }
}
