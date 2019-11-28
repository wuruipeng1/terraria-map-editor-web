
import "./polyfill-requestAnimationFrame.js";

import store from "/state/store.js";
import { changePercentage, changeDescription } from "/state/modules/status.js";

let worldFile;
let world;
let canvasEl, ctx;
let running = false;
let image, renderImage;
let width, height;
let prevWidth, prevHeight;

let previousValue;
store.subscribe(() => {
    const value = store.getState().menu.file;

    if (value === null) {
        previousValue = null;
        worldFile = null;
        running = false;
    }
    else if (value instanceof File) {
        if (previousValue == undefined || (previousValue.name !== value.name && previousValue.size !== value.size && previousValue.lastModified !== value.lastModified)) {
            previousValue = value;
            worldFile = value;
            load();
        }
    }
});

const init = (_canvasEl) => {
    canvasEl = _canvasEl;
    ctx = canvasEl.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;

    prevWidth = width = canvasEl.width = canvasEl.clientWidth;
    prevHeight = height = canvasEl.height = canvasEl.clientHeight;

    window.addEventListener("resize", () => {
        width = canvasEl.width = canvasEl.clientWidth;
        height = canvasEl.height = canvasEl.clientHeight;
    });

    canvasEl.addEventListener("wheel", onCanvasWheel);
    canvasEl.addEventListener("mouseup", onCanvasMouseUp);
    document.addEventListener("mouseup", onCanvasMouseUp);
    canvasEl.addEventListener("mousedown", onCanvasMouseDown);
    canvasEl.addEventListener("mousemove", onCanvasMouseMove);
}

const load = async () => {
    try {
        await new Promise((resolve, reject) => {
            const worker = new Worker("./web-worker-map-parsing.js");

            worker.onerror = ({ message }) => {
                reject(message);
            }

            worker.onmessageerror =({ message }) => {
                reject(message);
            }

            worker.onmessage = ({ data }) => {
                switch(data.action) {
                    case "RETURN_PERCENTAGE_PARSING_INCOMING":
                        store.dispatch(changeDescription("Parsing"));
                        break;
                    case "RETURN_PERCENTAGE_PARSING":
                        store.dispatch(changePercentage(data.percentage));
                        break;
                    case "RETURN_PERCENTAGE_RENDERING_INCOMING":
                        store.dispatch(changeDescription("Rendering"));
                        break;
                    case "RETURN_PERCENTAGE_RENDERING":
                        store.dispatch(changePercentage(data.percentage));
                        break;
                    case "RETURN_IMAGE_INCOMING":
                        store.dispatch(changeDescription("Copying 1/2"));
                        break;
                    case "RETURN_IMAGE":
                        image = data.image;
                        break;
                    case "RETURN_PARSED_MAP_INCOMING":
                        store.dispatch(changeDescription("Copying 2/2"));
                        break;
                    case "RETURN_PARSED_MAP":
                        world = data.world;
                        start();
                        store.dispatch(changeDescription("Finished"));
                        resolve();
                        break;
                }
            }

            worker.postMessage({
                action: "PARSE_AND_RENDER_MAP",
                file: worldFile
            });
        });
    }
    catch(e) {
        console.error(e);
        return;
    }
}

const calculateRatioWidth = height => height * (world.header.maxTilesX / world.header.maxTilesY);
const calculateRatioHeight = width => width * (world.header.maxTilesY / world.header.maxTilesX);

const onCanvasWheel = e => {
    if (e.deltaY > 0) {
        zoom(1);
    } else {
        zoom(-1)
    }
}

const zoom = direction => {
    const zoomFactorX = 200;
    const zoomFactorY = 56.25;

    if (direction == 1) {
        console.log("zooming");
        canvasEl.width += zoomFactorX;
        canvasEl.height += zoomFactorY;
    } else if (direction == -1) {
        console.log("unzooming");
        canvasEl.width -= zoomFactorX;
        canvasEl.height -= zoomFactorY;
    }
}

let isDragging = false;
let deltaX = 0;
let deltaY = 0;
let prevDragX = null;
let prevDragY = null;

const onCanvasMouseDown = e => {
    isDragging = true;
    console.log(e);
}

const onCanvasMouseUp = e => {
    isDragging = false;
    deltaX = deltaY = 0;
    prevDragX = prevDragY = null;
    console.log(e);
}

const onCanvasMouseMove = e => {
    if (!isDragging)
        return;

    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - Math.floor(rect.top);

    if (prevDragX == null) {
        prevDragX = x;
        prevDragY = y;
        return;
    }

    deltaX = x - prevDragX;
    deltaY = y - prevDragY;

    prevDragX = x;
    prevDragY = y;

    posX += deltaX;
    posY += deltaY;
    console.log(deltaX, deltaY);
}

let posX;
let posY;

const start = () => {
    posX = -1 * world.header.maxTilesX / 2 + width / 2;
    posY = 0;
    running = true;
    tick(0);

    console.log(world);
}

const tick = async (T) => {

    ctx.clearRect(0, 0, canvasEl.clientWidth, canvasEl.clientHeight);
    ctx.putImageData( image, posX, posY );

    if (running)
        requestAnimationFrame(tick, canvasEl);
}

export default init;
