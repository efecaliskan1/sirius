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
    audio.loop = false;
    audio.volume = clampVolume(volume);

    const restartAt = () => {
        const loopPoint = Number.isFinite(audio.duration) && audio.duration > 0
            ? Math.min(audio.duration, MAX_LOOP_SECONDS)
            : MAX_LOOP_SECONDS;

        if (audio.currentTime >= loopPoint) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
    };

    const restartOnEnd = () => {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    };

    audio.addEventListener('timeupdate', restartAt);
    audio.addEventListener('ended', restartOnEnd);

    activeCleanup = () => {
        audio.removeEventListener('timeupdate', restartAt);
        audio.removeEventListener('ended', restartOnEnd);
    };

    activeAudio = audio;
    await audio.play();
}

export function stopAmbientSound() {
    cleanupActiveAudio();
}

export function setAmbientVolume(volume) {
    if (!activeAudio) return;
    activeAudio.volume = clampVolume(volume);
}
