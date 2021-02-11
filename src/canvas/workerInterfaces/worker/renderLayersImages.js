import Worker from "/canvas/worker.js";

import "/utils/polyfills/polyfill-imageData.js";
import colors, { getTileVariantIndex } from "/utils/dbs/colors.js";
import LAYERS from "/utils/dbs/LAYERS.js";

import { map } from "/utils/number.js";

export default async function() {
    if (!Worker.worldObject) {
        throw new Error("worker error: render: no world loaded");
        return;
    }

    let layersImages = [];
    Object.values(LAYERS).forEach(LAYER => {
        layersImages[LAYER] = new ImageData(Worker.worldObject.header.maxTilesX, Worker.worldObject.header.maxTilesY);
    })

    const bgLayers = {
        space: 80, // below
        // sky - betweens
        ground: Worker.worldObject.header.worldSurface, //above
        cavern: Worker.worldObject.header.rockLayer, //above
        underworld: Worker.worldObject.header.maxTilesY - 192, //above
    };

    postMessage({
        action: "RETURN_RENDERING_PERCENT_INCOMING",
    });

    let position = 0;
    const setPointColor = (LAYER, color) => {
        if (!color)
            color = { r:0, g:0, b:0, a:0 };

        layersImages[LAYER].data[position]     = color.r;
        layersImages[LAYER].data[position + 1] = color.g;
        layersImages[LAYER].data[position + 2] = color.b;
        layersImages[LAYER].data[position + 3] = color.a;
    }

    const drawOnePercent = Worker.worldObject.header.maxTilesY / 100;
    let drawPercentNext = 0;
    let drawPercent = 0;
    for (let y = 0; y < Worker.worldObject.header.maxTilesY; y++) {
        if (y > drawPercentNext) {
            drawPercentNext += drawOnePercent;
            drawPercent++;
            postMessage({
                action: "RETURN_RENDERING_PERCENT",
                percent: drawPercent
            });
        }

        let backgroundColumnCache = [];

        for (let x = 0; x < Worker.worldObject.header.maxTilesX; x++) {
            const tile = Worker.worldObject.tiles[x][y];

            if (tile.blockId !== undefined)
                if (colors[LAYERS.TILES][tile.blockId].r)
                    setPointColor(LAYERS.TILES, colors[LAYERS.TILES][tile.blockId]);
                else
                    setPointColor(LAYERS.TILES, colors[LAYERS.TILES][tile.blockId][ getTileVariantIndex(tile.blockId, tile.frameX, tile.frameY) ]);

            if (tile.liquidType)
                setPointColor(LAYERS.LIQUIDS, colors[LAYERS.LIQUIDS][tile.liquidType]);

            if (tile.wallId !== undefined)
                setPointColor(LAYERS.WALLS, colors[LAYERS.WALLS][tile.wallId]);

            if (tile.wireRed)
                setPointColor(LAYERS.WIRES, colors[LAYERS.WIRES]["red"]);
            if (tile.wireGreen)
                setPointColor(LAYERS.WIRES, colors[LAYERS.WIRES]["green"]);
            if (tile.wireBlue)
                setPointColor(LAYERS.WIRES, colors[LAYERS.WIRES]["blue"]);
            if (tile.wireYellow)
                setPointColor(LAYERS.WIRES, colors[LAYERS.WIRES]["yellow"]);

            if (x == 0) {
                if (y < bgLayers.ground) {
                    const gradientPercent = map(y, 0, bgLayers.ground, 0, 1);
                    backgroundColumnCache[y] = {
                        r: colors[LAYERS.BACKGROUND].skyGradient[0].r + gradientPercent * (colors[LAYERS.BACKGROUND].skyGradient[1].r - colors[LAYERS.BACKGROUND].skyGradient[0].r),
                        g: colors[LAYERS.BACKGROUND].skyGradient[0].g + gradientPercent * (colors[LAYERS.BACKGROUND].skyGradient[1].g - colors[LAYERS.BACKGROUND].skyGradient[0].g),
                        b: colors[LAYERS.BACKGROUND].skyGradient[0].b + gradientPercent * (colors[LAYERS.BACKGROUND].skyGradient[1].b - colors[LAYERS.BACKGROUND].skyGradient[0].b),
                        a: 255
                    };
                }
                else if (y >= bgLayers.ground && y < bgLayers.cavern)
                    backgroundColumnCache[y] = colors[LAYERS.BACKGROUND].ground;
                else if (y >= bgLayers.cavern && y < bgLayers.underworld)
                    backgroundColumnCache[y] = colors[LAYERS.BACKGROUND].cavern;
                else if (y >= bgLayers.underworld)
                    backgroundColumnCache[y] = colors[LAYERS.BACKGROUND].underworld;
            }

            setPointColor(LAYERS.BACKGROUND, backgroundColumnCache[y]);

            position += 4;
        }
    }

    postMessage({
        action: "RETURN_LAYERS_IMAGES_INCOMING",
    });

    postMessage({
        action: "RETURN_LAYERS_IMAGES",
        layersImages
    });
}