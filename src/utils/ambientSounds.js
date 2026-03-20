let audioContext = null;
let activeScene = null;

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    return audioContext;
}

function createBufferSource(ctx, generator) {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    generator(output);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
}

function createBrownNoise(ctx, destination, gainValue, cutoff = 500) {
    let lastOut = 0;
    const source = createBufferSource(ctx, (output) => {
        for (let index = 0; index < output.length; index += 1) {
            const white = Math.random() * 2 - 1;
            output[index] = (lastOut + 0.02 * white) / 1.02;
            lastOut = output[index];
            output[index] *= 3.5;
        }
    });

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;

    const gainNode = ctx.createGain();
    gainNode.gain.value = gainValue;

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(destination);
    source.start();

    return { stopNodes: [source], connectedNodes: [filter, gainNode] };
}

function createPinkNoise(ctx, destination, gainValue) {
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    const source = createBufferSource(ctx, (output) => {
        for (let index = 0; index < output.length; index += 1) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[index] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }
    });

    const gainNode = ctx.createGain();
    gainNode.gain.value = gainValue;

    source.connect(gainNode);
    gainNode.connect(destination);
    source.start();

    return { stopNodes: [source], connectedNodes: [gainNode] };
}

function createOscillator(ctx, destination, { frequency, type = 'sine', gain = 0.02, filterFrequency = null, q = 0.7 }) {
    const oscillator = ctx.createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = frequency;

    const gainNode = ctx.createGain();
    gainNode.gain.value = gain;

    let filter = null;

    oscillator.connect(gainNode);

    if (filterFrequency) {
        filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = filterFrequency;
        filter.Q.value = q;
        gainNode.connect(filter);
        filter.connect(destination);
    } else {
        gainNode.connect(destination);
    }

    oscillator.start();

    return {
        stopNodes: [oscillator],
        connectedNodes: filter ? [gainNode, filter] : [gainNode],
    };
}

function collectParts(parts) {
    return parts.reduce((accumulator, part) => ({
        stopNodes: [...accumulator.stopNodes, ...(part.stopNodes || [])],
        connectedNodes: [...accumulator.connectedNodes, ...(part.connectedNodes || [])],
    }), { stopNodes: [], connectedNodes: [] });
}

function createRainScene(ctx, destination) {
    const baseRain = createBrownNoise(ctx, destination, 0.42, 850);
    const detailRain = createPinkNoise(ctx, destination, 0.08);
    const air = createOscillator(ctx, destination, { frequency: 180, type: 'triangle', gain: 0.003 });
    return collectParts([baseRain, detailRain, air]);
}

function createLibraryScene(ctx, destination) {
    const roomTone = createBrownNoise(ctx, destination, 0.16, 260);
    const pageTexture = createPinkNoise(ctx, destination, 0.05);
    const airHum = createOscillator(ctx, destination, { frequency: 62, gain: 0.024 });
    const fluorescent = createOscillator(ctx, destination, { frequency: 118, gain: 0.01, type: 'triangle' });
    const roomResonance = createOscillator(ctx, destination, { frequency: 240, gain: 0.006, type: 'sine' });
    return collectParts([roomTone, pageTexture, airHum, fluorescent, roomResonance]);
}

function createCafeScene(ctx, destination) {
    const roomBed = createBrownNoise(ctx, destination, 0.2, 520);
    const chatter = createPinkNoise(ctx, destination, 0.1);
    const cupTone = createOscillator(ctx, destination, { frequency: 420, gain: 0.012, type: 'triangle', filterFrequency: 820, q: 1.4 });
    const lowHum = createOscillator(ctx, destination, { frequency: 110, gain: 0.014, type: 'sawtooth' });
    const espressoSteam = createOscillator(ctx, destination, { frequency: 760, gain: 0.005, type: 'square', filterFrequency: 1000, q: 0.9 });
    return collectParts([roomBed, chatter, cupTone, lowHum, espressoSteam]);
}

export async function startAmbientSound(type, volume = 0.45) {
    stopAmbientSound();

    if (!type || type === 'none') return;

    try {
        const ctx = getAudioContext();

        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        const masterGain = ctx.createGain();
        masterGain.gain.value = volume;
        masterGain.connect(ctx.destination);

        let scene = null;
        if (type === 'rain') scene = createRainScene(ctx, masterGain);
        if (type === 'cafe') scene = createCafeScene(ctx, masterGain);
        if (type === 'library') scene = createLibraryScene(ctx, masterGain);

        activeScene = {
            masterGain,
            stopNodes: scene?.stopNodes || [],
            connectedNodes: scene?.connectedNodes || [],
        };
    } catch (error) {
        console.warn('Failed to start ambient sound:', error);
        stopAmbientSound();
    }
}

export function stopAmbientSound() {
    if (!activeScene) return;

    activeScene.stopNodes.forEach((node) => {
        try {
            node.stop();
        } catch {
            // Node may already be stopped.
        }
        try {
            node.disconnect();
        } catch {
            // Node may already be disconnected.
        }
    });

    activeScene.connectedNodes.forEach((node) => {
        try {
            node.disconnect();
        } catch {
            // Node may already be disconnected.
        }
    });

    try {
        activeScene.masterGain.disconnect();
    } catch {
        // Gain node may already be disconnected.
    }

    activeScene = null;
}

export function setAmbientVolume(volume) {
    if (!activeScene?.masterGain || !audioContext) return;

    const nextVolume = Math.max(0, Math.min(1, volume));
    activeScene.masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    activeScene.masterGain.gain.linearRampToValueAtTime(nextVolume, audioContext.currentTime + 0.12);
}
