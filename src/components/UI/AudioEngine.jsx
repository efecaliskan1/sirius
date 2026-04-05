import { useEffect, useRef } from 'react';
import useAppStore from '../../store/appStore';

export default function AudioEngine() {
    const ambientSounds = useAppStore(s => s.ambientSounds);
    const audioRefs = useRef({});
    const safeAmbientSounds = Array.isArray(ambientSounds) ? ambientSounds : [];

    useEffect(() => {
        safeAmbientSounds.forEach(sound => {
            if (!sound.url) {
                return;
            }

            // Create audio object if not exists
            if (!audioRefs.current[sound.id]) {
                const audio = new Audio(sound.url);
                audio.loop = true;
                audioRefs.current[sound.id] = audio;
            }

            const audio = audioRefs.current[sound.id];

            // Set volume
            audio.volume = sound.volume / 100;

            // Handle play/pause
            if (sound.isPlaying && sound.volume > 0) {
                if (audio.paused) {
                    audio.play().catch(e => console.log('Audio autoplay blocked by browser', e));
                }
            } else {
                if (!audio.paused) {
                    audio.pause();
                }
            }
        });

        // Cleanup on unmount
        return () => {
            Object.values(audioRefs.current).forEach(audio => {
                audio.pause();
                audio.src = '';
            });
            audioRefs.current = {};
        };
    }, [safeAmbientSounds]);

    return null; // This is a logic-only component rendering nothing
}
