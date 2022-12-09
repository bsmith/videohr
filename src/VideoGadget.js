import { useEffect, useRef, useState } from 'react';
import './VideoGadget.scss';

/* for a nice Van Gogh effect I had gamma at 0.5, and the boost factor at 100.

/* assume a heart rate between 60 and 120 bpm;
   this is 1 to 2 s^-1
   For Nyquist, aim for at least 2.5, but 10 would be better:
   5 to 20 fps target range */

/* accumData could be any Uint8ClampedArray, and only store the 1 channel */
const mungeImage = (image, outputData, accumData) => {
    const imageData = image.data;
    const {width, height} = image;
    let signal = 0;

    for (let x = 0; x < width; x++)
        for (let y = 0; y < height; y++) {
            const index = y * width * 4 + x * 4;

            /* the kernel */
            const gamma = 0.5;
            let accum = accumData[index+1];
            const input = imageData[index+1];
            accum = (1-gamma)*accum + gamma*input;
            const output = input + (accum - input) * 100;

            signal += Math.abs(accum - input);

            accumData[index+1] = accum; /* write back */

            outputData[index+0] = 0; /* R */
            outputData[index+1] = output; /* G */
            outputData[index+2] = 0; /* B */
            outputData[index+3] = 255; /* A */
        }
    return { signal };
};

const VideoGadget = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const stateRef = useRef({
        accumData: null,
        lastMillis: Date.now(),
        intervalId: null,
        buffer: [], /*Array(12 * 10).fill(0)*/
    });
    const [fpsCounter, setFpsCounter] = useState(0);
    const [outputDisplay, setOutputDisplay] = useState("");

    const startVideo = async () => {
        const media = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { min: 640 },
                height: { min: 480 },
                facingMode: 'user',
            },
        });
        // console.log(media);
        videoRef.current.srcObject = media;
    };

    const stopVideo = async () => {
        const stream = videoRef.current.srcObject;
        videoRef.current.srcObject = null;
        stream.getTracks().forEach(track => track.stop());
        stopCaptures();
    }

    const captureImage = async () => {
        const context = canvasRef.current.getContext("2d", { willReadFrequently: true });
        canvasRef.current.width = 640;
        canvasRef.current.height = 480;
        context.drawImage(videoRef.current, 0, 0, 640, 480);

        const centreAreaSize = 200;
        const centreAreaPos = [(640 - centreAreaSize) / 2, (480 - centreAreaSize) / 2];
        const imageData = context.getImageData(centreAreaPos[0], centreAreaPos[1], centreAreaSize, centreAreaSize);
        // console.log(imageData);

        /* update fps counter */
        const curMillis = Date.now();
        const fps = 1000 / (curMillis - stateRef.current.lastMillis);
        stateRef.current.lastMillis = curMillis;
        setFpsCounter(fps);

        if (!stateRef.current.accumData || stateRef.current.accumData.width !== imageData.width) {
            stateRef.current.accumData = context.createImageData(imageData);
            stateRef.current.accumData.data.fill(127);
        }

        const processedData = context.createImageData(imageData);
        const { signal } = mungeImage(imageData, processedData.data, stateRef.current.accumData.data);
        // console.log(processedData);
        // console.log(signal);
        const { buffer } = stateRef.current;
        // buffer.shift();
        buffer.push(signal);
        // console.log(buffer);

        context.putImageData(processedData, centreAreaPos[0], centreAreaPos[1]);
    };

    const stopCaptures = () => {
        if (stateRef.current.intervalId) {
            clearInterval(stateRef.current.intervalId);
            stateRef.current.intervalId = null;
            setOutputDisplay(JSON.stringify(stateRef.current.buffer));
            stateRef.current.buffer = [];
            return true;
        }
        return false;
    };
    /* using this for a callback on unmount */
    useEffect(() => {
        return () => {
            console.log("unmount");
            stopCaptures();
        };
    }, []);

    const toggleCaptures = async () => {
        const targetFps = 24;
        if (stopCaptures())
            return;
        stateRef.current.intervalId = setInterval(captureImage, 1000 / targetFps);
        setTimeout(() => {
            stopCaptures();
        }, 10000)
    };

    return <div className="VideoGadget">
        <div className="video">
            <video ref={videoRef} autoPlay controls />
            <canvas ref={canvasRef} />
        </div>
        <output className="fps-counter">{fpsCounter.toFixed(4)}</output>
        <div className="controls">
            <button onClick={startVideo}>Start Video</button>
            <button onClick={stopVideo}>Stop Video</button>
            <button onClick={captureImage}>Capture Image</button>
            <button onClick={toggleCaptures}>Toggle Captures</button>
        </div>
        <output className="display">{outputDisplay}</output>
    </div>
};

export default VideoGadget;