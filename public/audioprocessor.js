/**
 * AUDIO PROCESSOR - LIQUID PITCH SHIFTER
 * Portado del algoritmo de Cockos (Reaper JSFX) para Web Audio API
 */

async function applyLiquidPitchShift(buffer, ctx, strength) {
    // OfflineAudioContext permite procesar el audio mucho más rápido que en tiempo real
    const offlineCtx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    
    // Crear buffer de salida
    const outputBuffer = offlineCtx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const inputData = buffer.getChannelData(channel);
        const outputData = outputBuffer.getChannelData(channel);
        const sampleRate = buffer.sampleRate;
        
        // Parámetros del Pitch Shifter (basados en ventana de tiempo)
        let bufferSize = Math.floor(sampleRate * 0.05); // Ventana de 50ms
        let delayBuffer = new Float32Array(bufferSize);
        let writePos = 0;
        let readPos = 0;

        for (let i = 0; i < inputData.length; i++) {
            // 1. Detectar amplitud (Envelope Follower instantáneo)
            const amplitude = Math.abs(inputData[i]);
            
            // 2. Calcular Pitch Reactivo
            // El pitch base es 1.0 (normal). 
            // Sube proporcionalmente a la amplitud multiplicada por la fuerza elegida
            const pitch = 1.0 + (amplitude * strength); 

            // 3. Escribir en el buffer circular (Delay Line)
            delayBuffer[writePos] = inputData[i];
            
            // 4. Leer con Pitch Shift (Lógica de interpolación lineal)
            let i1 = Math.floor(readPos);
            let i2 = (i1 + 1) % bufferSize;
            let frac = readPos - i1;
            
            outputData[i] = delayBuffer[i1] * (1 - frac) + delayBuffer[i2] * frac;

            // Avanzar punteros
            writePos = (writePos + 1) % bufferSize;
            readPos = (readPos + pitch) % bufferSize;

            // Prevención de colisión de punteros (Crossfade/Jump simple)
            if (Math.abs(readPos - writePos) < 1) {
                readPos = (writePos + bufferSize * 0.5) % bufferSize;
            }
        }
    }
    return outputBuffer;
}

/**
 * Convierte un AudioBuffer de WebAudio a un Blob de archivo WAV
 * para que FFmpeg pueda leerlo.
 */
function bufferToWav(buffer) {
    let numOfChan = buffer.numberOfChannels,
        length = buffer.length * numOfChan * 2 + 44,
        bufferArr = new ArrayBuffer(length),
        view = new DataView(bufferArr),
        channels = [], i, sample,
        offset = 0,
        pos = 0;

    const setUint16 = (data) => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data) => { view.setUint32(pos, data, true); pos += 4; };

    // WAV Header
    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // File size
    setUint32(0x45564157);                         // "WAVE"
    setUint32(0x20746d66);                         // "fmt "
    setUint32(16);                                 // Chunk size
    setUint16(1);                                  // PCM
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);                      // Block align
    setUint16(16);                                 // Bits per sample
    setUint32(0x61746164);                         // "data"
    setUint32(length - pos - 4);                   // Data size

    for (i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][Math.floor((pos-44)/(numOfChan*2))]));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
    }

    return new Blob([bufferArr], { type: "audio/wav" });
}