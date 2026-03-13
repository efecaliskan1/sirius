// Ambient sound generator using Web Audio API
// Generates procedural sounds without any external files

let audioContext = null;
let activeNodes = [];

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

function createBrownNoise(ctx, gain) {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gainNode = ctx.createGain();
    gainNode.gain.value = gain;

    // Low pass for smoothness
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start();
    return { source, gainNode, filter };
}

function createPinkNoise(ctx, gain) {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11;
        b6 = white * 0.115926;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gainNode = ctx.createGain();
    gainNode.gain.value = gain;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start();
    return { source, gainNode };
}

function createRain() {
    const ctx = getAudioContext();
    // Main rain: brown noise with heavy low-pass
    const rain = createBrownNoise(ctx, 0.3);
    rain.filter.frequency.value = 800;

    // Rain detail: pink noise at lower volume + high-pass
    const detail = createPinkNoise(ctx, 0.08);
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 2000;

    // Reconnect detail through highpass
    detail.source.disconnect();
    detail.source.connect(highpass);
    highpass.connect(detail.gainNode);

    activeNodes.push(rain.source, detail.source);
    return { sources: [rain, detail] };
}

function createForest() {
    const ctx = getAudioContext();
    // Wind: gentle brown noise
    const wind = createBrownNoise(ctx, 0.15);
    wind.filter.frequency.value = 300;

    // Rustling leaves: pink noise with bandpass
    const leaves = createPinkNoise(ctx, 0.04);
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 3000;
    bandpass.Q.value = 0.5;

    leaves.source.disconnect();
    leaves.source.connect(bandpass);
    bandpass.connect(leaves.gainNode);

    // Subtle modulation via LFO
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.06;
    lfo.connect(lfoGain);
    lfoGain.connect(wind.gainNode.gain);
    lfo.start();

    activeNodes.push(wind.source, leaves.source, lfo);
    return { sources: [wind, leaves] };
}

function createLibrary() {
    const ctx = getAudioContext();
    // Very quiet ambient: gentle brown noise, nearly silent
    const ambient = createBrownNoise(ctx, 0.06);
    ambient.filter.frequency.value = 200;

    // Subtle air conditioning hum
    const hum = ctx.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 60;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.015;
    hum.connect(humGain);
    humGain.connect(ctx.destination);
    hum.start();

    activeNodes.push(ambient.source, hum);
    return { sources: [ambient] };
}

export function startAmbientSound(type) {
    stopAmbientSound();
    if (type === 'none' || !type) return;

    try {
        switch (type) {
            case 'rain': createRain(); break;
            case 'forest': createForest(); break;
            case 'library': createLibrary(); break;
            default: break;
        }
    } catch (e) {
        console.warn('Failed to start ambient sound:', e);
    }
}

export function stopAmbientSound() {
    for (const node of activeNodes) {
        try { node.stop(); } catch { }
        try { node.disconnect(); } catch { }
    }
    activeNodes = [];
}

export function setAmbientVolume(volume) {
    // Volume 0-1
    for (const node of activeNodes) {
        try {
            if (node.gain) {
                node.gain.value = volume;
            }
        } catch { }
    }
}
