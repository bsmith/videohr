import { useRef, useState } from 'react';
import './VideoGadget.scss';

/* assume a heart rate between 60 and 120 bpm;
   this is 1 to 2 s^-1
   For Nyquist, aim for at least 2.5, but 10 would be better:
   5 to 20 fps target range */

/* accumData could be any Uint8ClampedArray, and only store the 1 channel */
const mungeImage = (imageData, outputData, accumData) => {
    const [width, height] = [640, 480];
    for (let x = 0; x < width; x++)
        for (let y = 0; y < height; y++) {
            const index = y * width * 4 + x * 4;

            /* the kernel */
            const gamma = 0.5;
            let accum = accumData[index+1];
            const input = imageData[index+1];
            accum = (1-gamma)*accum + gamma*input;
            const output = input + (accum - input) * 100;

            accumData[index+1] = accum; /* write back */

            outputData[index+0] = 0; /* R */
            outputData[index+1] = output; /* G */
            outputData[index+2] = 0; /* B */
            outputData[index+3] = 255; /* A */
        }
    return outputData;
};

const VideoGadget = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const stateRef = useRef({
        accumData: null,
        lastMillis: Date.now(),
    });
    const [fpsCounter, setFpsCounter] = useState(0);

    const startVideo = async () => {
        const media = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { min: 640 },
                height: { min: 480 },
                facingMode: 'user',
            },
        });
        console.log(media);
        videoRef.current.srcObject = media;
    };

    const captureImage = async () => {
        const context = canvasRef.current.getContext("2d", { willReadFrequently: true });
        canvasRef.current.width = 640;
        canvasRef.current.height = 480;
        context.drawImage(videoRef.current, 0, 0, 640, 480);
        const imageData = context.getImageData(0, 0, 640, 480);
        // console.log(imageData);

        /* update fps counter */
        const curMillis = Date.now();
        const fps = 1000 / (curMillis - stateRef.current.lastMillis);
        stateRef.current.lastMillis = curMillis;
        setFpsCounter(fps);

        if (!stateRef.current.accumData)
        stateRef.current.accumData = context.createImageData(640, 480);

        const processedData = context.createImageData(640, 480);
        mungeImage(imageData.data, processedData.data, stateRef.current.accumData.data);
        console.log(processedData);

        context.putImageData(processedData, 0, 0);
    };

    return <div className="VideoGadget">
        <div className="video">
            <video ref={videoRef} autoPlay controls />
            <canvas ref={canvasRef} />
        </div>
        <output className="fps-counter">{fpsCounter}</output>
        <div className="controls">
            <button onClick={startVideo}>Start Video</button>
            <button onClick={captureImage}>Capture Image</button>
        </div>
    </div>
};

export default VideoGadget;