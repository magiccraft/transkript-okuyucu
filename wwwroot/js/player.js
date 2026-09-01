import { state } from './state.js';
import { formatTimeSpan } from './utils.js';
import { trackVideoProgress } from './history.js';

let syncLoopCallback = null;
let syncInterval = null;

export function registerSyncLoopCallback(cb) {
    syncLoopCallback = cb;
}

export async function mountYouTubePlayer(videoId) {
    if (!videoId) return;

    const wrapper = document.getElementById('ytVideoWrapper');
    if (!wrapper) return;

    // Temiz bir wrapper ve player div'i oluştur
    wrapper.innerHTML = '<div id="ytEmbedPlayer"></div>';

    // Daha önce yüklenmişse veya çalışıyorsa direkt bağla
    if (window.YT && window.YT.Player) {
        initPlayer(videoId);
        return;
    }

    // Yüklenmediyse, YouTube API Script'ini çağır
    return new Promise((resolve) => {
        window.onYouTubeIframeAPIReady = () => {
            initPlayer(videoId);
            resolve();
        };

        if (!document.querySelector('script[src*="iframe_api"]')) {
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(script);
        }
    });
}

function initPlayer(videoId) {
    // Önceki nesne referansını temizle (var ise)
    if (state.player && typeof state.player.destroy === 'function') {
        try { state.player.destroy(); } catch (e) {}
    }

    state.player = new YT.Player('ytEmbedPlayer', {
        videoId: videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
            autoplay: 1,
            controls: 1, // Kesinlikle kendi barı ve butonları görünür olsun
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            disablekb: 0,
            fs: 1,
            origin: window.location.origin
        },
        events: {
            onReady: (event) => {
                state.isPlayerReady = true;
                const dur = event.target.getDuration();
                if (dur > 0) {
                    state.durationSeconds = dur;
                    const durElem = document.getElementById('videoDuration');
                    if (durElem) durElem.textContent = formatTimeSpan(dur);
                }

                // Geçmişten devam ediyorsa
                if (state.pendingSeekTime > 0) {
                    event.target.seekTo(state.pendingSeekTime, true);
                    state.pendingSeekTime = 0;
                }

                event.target.playVideo();
                startSyncLoop();
            },
            onStateChange: (event) => {
                if (event.data === YT.PlayerState.PLAYING) {
                    state.isPlaying = true;
                    startSyncLoop();
                } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                    state.isPlaying = false;
                }
            }
        }
    });
}

export function seekVideoTo(seconds) {
    if (state.player && typeof state.player.seekTo === 'function') {
        state.player.seekTo(seconds, true);
        state.player.playVideo();
        state.isPlaying = true;
    }
}

export function seekRelative(deltaSeconds) {
    if (!state.player || typeof state.player.getCurrentTime !== 'function') return;
    const current = state.player.getCurrentTime();
    const target = Math.max(0, current + deltaSeconds);
    seekVideoTo(target);
}

export function togglePlayPause() {
    if (!state.player || typeof state.player.getPlayerState !== 'function') return;

    const playerState = state.player.getPlayerState();
    if (playerState === YT.PlayerState.PLAYING) {
        state.player.pauseVideo();
        state.isPlaying = false;
    } else {
        state.player.playVideo();
        state.isPlaying = true;
    }
}

export function toggleMute() {
    if (!state.player || typeof state.player.isMuted !== 'function') return;
    if (state.player.isMuted()) {
        state.player.unMute();
    } else {
        state.player.mute();
    }
}

export function toggleFullscreen() {
    const iframe = document.getElementById('ytEmbedPlayer');
    if (!iframe) return;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (iframe.requestFullscreen) {
            iframe.requestFullscreen();
        } else if (iframe.webkitRequestFullscreen) {
            iframe.webkitRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

export function startSyncLoop() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => {
        if (!state.player || typeof state.player.getCurrentTime !== 'function') return;

        const currentTime = state.player.getCurrentTime();
        trackVideoProgress(currentTime);

        if (typeof syncLoopCallback === 'function') {
            syncLoopCallback();
        }
    }, 200);
}
