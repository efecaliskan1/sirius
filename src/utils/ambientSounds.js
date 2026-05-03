const MAX_LOOP_SECONDS = 15 * 60;

const AMBIENT_AUDIO_FILES = {
    rain: '/ambient-rain.mp3',
    cafe: '/ambient-cafe.mp3',
    fire: '/ambient-fire.mp3',
    wave: '/ambient-wave.mp3',
};

let activeAudio = null;
let activeCleanup = null;

function canUseAudio() {
    return typeof window !== 'undefined' && typeof Audio !== 'undefined';
}

function clampVolume(volume) {
    const parsed = Number(volume);
    if (!Number.isFinite(parsed)) {
        return 0.45;
    }
    return Math.max(0, Math.min(1, parsed));
}

function cleanupActiveAudio() {
    if (activeCleanup) {
        try {
            activeCleanup();
        } catch {
            // Ignore cleanup errors.
        }
        activeCleanup = null;
    }

    if (activeAudio) {
        try {
            activeAudio.pause();
        } catch {
            // Ignore pause errors.
        }

        try {
            activeAudio.removeAttribute('src');
            activeAudio.load();
        } catch {
            // Ignore release errors.
        }

        activeAudio = null;
    }
}

export async function startAmbientSound(type, volume = 0.45) {
    stopAmbientSound();

    const src = AMBIENT_AUDIO_FILES[type];
    if (!src || !canUseAudio()) {
        return;
    }

    const audio = new Audio(src);
    audio.preload = 'auto';
    // Use the browser's native loop so iOS WKWebView keeps the audio
    // playing even when the JS event loop is throttled.
    audio.loop = true;
    audio.volume = clampVolume(volume);
    // iOS requires this attribute for media to play in WKWebView without
    // taking over the screen as a fullscreen player.
    audio.setAttribute('playsinline', '');
    audio.setAttribute('webkit-playsinline', '');

    activeCleanup = () => {};

    activeAudio = audio;

    try {
        await audio.play();
    } catch (error) {
        // iOS can reject play() if not within a direct user-gesture chain.
        // Surface the error so callers can react (e.g. show a "tap to enable
        // sound" hint), but don't crash.
        console.warn('Ambient sound play() rejected:', error?.message || error);
    }
}

export function stopAmbientSound() {
    cleanupActiveAudio();
}

export function setAmbientVolume(volume) {
    if (!activeAudio) return;
    activeAudio.volume = clampVolume(volume);
}
