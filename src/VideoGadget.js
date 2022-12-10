import { useEffect, useRef, useState } from 'react';
import './VideoGadget.scss';

const getElementPosition = (elem) => {
    var curleft = 0, curtop = 0;
    if (elem.offsetParent) {
        do {
            curleft += elem.offsetLeft;
            curtop += elem.offsetTop;
            elem = elem.offsetParent;
        } while (elem);
        return [curleft, curtop];
    }
    return undefined;
}

/* for a nice Van Gogh effect I had gamma at 0.5, and the boost factor at 100. */

/* takes a 0-255 sRGB and outputs 0-1 float */
const srgbToLinear = (srgb) => {
    const gamma = ((srgb/255 + 0.055) / 1.055)**2.4;
    const scale = srgb/255 / 12.92;
    return srgb/255 > 0.04045 ? gamma : scale;
};

/* takes a 0-1 float and outputs a 0-255 sRGB int */
const linearToSrgb = (lin) => {
    const gamma = 1.055 * (lin ** (1/2.4)) - 0.055;
    const scale = lin * 12.92;
    const srgb = lin > 0.0031308 ? gamma : scale;
    return Math.round(255 * srgb);
}

/* 0.18 is equiv to 118 */
console.log("0.18", srgbToLinear(118));
console.log("118", linearToSrgb(0.18));

const calcChromaKey = (image) => {
    const {width, height, data} = image;
    let [r, g, b] = [0, 0, 0];
    for (let x = 0; x < width; x++)
        for (let y = 0; y < height; y++) {
            const index = y * width * 4 + x * 4;
            r += srgbToLinear(data[index+0]);
            g += srgbToLinear(data[index+1]);
            b += srgbToLinear(data[index+2]);
        }
    r = linearToSrgb(r / (width*height));
    g = linearToSrgb(g / (width*height));
    b = linearToSrgb(b / (width*height));
    return [r, g, b];
};

/* assume a heart rate between 60 and 120 bpm;
   this is 1 to 2 s^-1
   For Nyquist, aim for at least 2.5, but 10 would be better:
   5 to 20 fps target range */

/* accumData could be any Uint8ClampedArray, and only store the 1 channel */
const mungeImage = (image, outputData, accumData, chromaKey) => {
    const imageData = image.data;
    const {width, height} = image;
    let signal = 0;

    for (let x = 0; x < width; x++)
        for (let y = 0; y < height; y++) {
            const index = y * width * 4 + x * 4;
            const input = [imageData[index+0], imageData[index+1], imageData[index+2]];

            let output = [0, 0, 0];
            let alpha = 0;

            const chromaDist = Math.sqrt((input[0] - chromaKey[0]) ** 2 + (input[1] - chromaKey[1]) ** 2 + (input[2] - chromaKey[2]) ** 2);
            if (chromaDist < 50) {
                alpha = 1;
                output = [0, 0, 255 - chromaDist];
            }

            /* chroma keying stuff */
            /* NB alpha-blend in the WRONG SPACE XXX */
            outputData[index+0] = (1-alpha)*imageData[index+0] + alpha * output[0]; /* R */
            outputData[index+1] = (1-alpha)*imageData[index+1] + alpha * output[1]; /* G */
            outputData[index+2] = (1-alpha)*imageData[index+2] + alpha * output[2]; /* B */
            outputData[index+3] = 255; /* A */

            /* the kernel */
            // const gamma = 0.5;
            // let accum = accumData[index+1];
            // const input = imageData[index+1];
            // accum = (1-gamma)*accum + gamma*input;
            // const output = input + (accum - input) * 100;

            // signal += Math.abs(accum - input);

            // accumData[index+1] = accum; /* write back */

            // const alpha = 0.5;
            // outputData[index+0] = alpha * 0; /* R */
            // outputData[index+1] = alpha * output; /* G */
            // outputData[index+2] = alpha * 0; /* B */
            // outputData[index+3] = alpha * 255; /* A */
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
        clickLocation: null,
        chromaKey: null,
    });
    const [fpsCounter, setFpsCounter] = useState(0);
    const [outputDisplay, setOutputDisplay] = useState("");
    const [chromaColour, setChromaColour] = useState('#000000');

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

        let { clickLocation, chromaKey } = stateRef.current;
        if (!chromaKey && clickLocation) {
            const imageData = context.getImageData(clickLocation[0] - 2, clickLocation[1] - 2, 5, 5);
            chromaKey = stateRef.current.chromaKey = calcChromaKey(imageData);
            console.log("chromaKey", chromaKey);
            setChromaColour(`rgb(${chromaKey[0]}, ${chromaKey[1]}, ${chromaKey[2]})`);
        }

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

        if (chromaKey) {
            const processedData = context.createImageData(imageData);
            const { signal } = mungeImage(imageData, processedData.data, stateRef.current.accumData.data, chromaKey);
            // const { buffer } = stateRef.current;
            // buffer.push(signal);

            context.putImageData(processedData, centreAreaPos[0], centreAreaPos[1]);
        }

        if (clickLocation) {
            context.beginPath();
            context.ellipse(clickLocation[0], clickLocation[1], 5, 5, 0, 0, 2*Math.PI);
            context.stroke();
        }
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
        if (0) setTimeout(() => {
            stopCaptures();
        }, 10000)
    };

    const canvasClick = (event) => {
        const pos = getElementPosition(event.target);
        stateRef.current.clickLocation = [event.pageX - pos[0], event.pageY - pos[1]];
        stateRef.current.chromaKey = null;
        // console.log(event);
        // console.log(stateRef.current.clickLocation);
    };

    return <div className="VideoGadget">
        <div className="video">
            <video ref={videoRef} autoPlay controls />
            <canvas ref={canvasRef} onClick={canvasClick} />
        </div>
        <output className="fps-counter">{fpsCounter.toFixed(4)}</output>
        <output className="chroma-colour" style={{backgroundColor: chromaColour}}>{chromaColour}</output>
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