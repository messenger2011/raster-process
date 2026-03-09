import fs from 'fs-extra';
import path from 'path';
import { merge } from 'lodash';
import Affine from '@sakitam-gis/affine';
import { Constant, Mercantile } from '@sakitam-gis/mercantile';
import { openAsync, GDT_Float32, GDT_Byte, GRA_Average, GRA_Bilinear, SpatialReference } from 'gdal-async';
import 'ndarray-gdal';
import ndarray from 'ndarray';
import { mercatorLngLatExtent } from '../config';
import { calcMinMax, diffMap, isValid } from '../utils';
import { floatToGray } from './normalizeData';
import { enlargeData } from './enlargeData';
import type { IEnlargeDataOptions } from './enlargeData';
import { default as reproject } from './reproject';
import type { IReprojectOptions } from './reproject';

export interface IGenerateTileOptions {
  clear: boolean;
  tileSize: number;
  zooms: [number, number, number] | [number, number] | number;
  dataType: string;
  bandCount: number;
  drivers: string | string[];
  clipExtent: boolean;
  writeExif: boolean;
  gray: boolean;
  bandName: string | ((zoom: string, band: number, info: any) => string);
  tileFolder: string;
  cacheFolder: string;
  cacheFilePrefix: string;
  enlargeOptions: Partial<IEnlargeDataOptions>;
  tileExtent: [number, number, number, number];
  tileProj4: string;
  reprojectOptions: Partial<IReprojectOptions>;
}

const defaultOptions = {
  clear: true,
  drivers: 'GTiff',
  bandCount: 1,
  tileSize: 256,
  gray: false,
  clipExtent: false,
  tileExtent: mercatorLngLatExtent,
  zooms: [0, 5, 1], // start,end,step
  dataType: GDT_Float32,
  bandName: (zoom, band, info) => info.GRIB_ELEMENT,
  tileFolder: 'tiles',
  cacheFolder: 'cache',
  cacheFilePrefix: 'mercator',
  tileProj4:
    '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs', // 3857
};

async function checkAndLoad(p, clear = false, load = true): Promise<any> {
  try {
    const stat = await fs.pathExists(p);

    if (!clear) {
      if (stat) {
        return load
          ? [
              true,
              {
                path: p,
                data: await openAsync(p),
              },
            ]
          : [true];
      }
      return [false];
    } else {
      if (stat) {
        await fs.removeSync(p);
      }
      return [false];
    }
  } catch (e) {
    console.error(e);
  }
}

export default async (
  data,
  folder: string,
  opt: Partial<IGenerateTileOptions> = {},
): Promise<{
  path: string[];
  data: Map<string, string>;
  errorData: Map<string, string>;
}> => {
  const options = merge({}, defaultOptions, opt);

  const tilesPath = new Map();
  const needPaths = new Map();
  try {
    let lastDst = data[1];

    if (!lastDst && data[0]) {
      lastDst = await openAsync(data[0]);
    }

    const zooms = Array.isArray(options.zooms)
      ? Constant.range(options.zooms[0], options.zooms[1], options.zooms[2])
      : Constant.range(options.zooms);

    // ── Phase 1: Build cache pyramid ──────────────────────────────────────────
    // Reproject original source → highest zoom once, then cascade average-
    // downsamples toward lower zoom levels. This replaces N independent full
    // reproj calls with 1 full reproj + (N-1) cheap avg-downsamples and
    // produces smoother lower-zoom tiles (2×2 block averaging vs re-sampling
    // from the coarse original each time).
    const sortedDesc = [...zooms].sort((a, b) => b - a);
    const cacheByZoom = new Map<number, { path: string | Buffer; data: any }>();

    for (let i = 0; i < sortedDesc.length; i++) {
      const z = sortedDesc[i];
      const tileWidth = options.tileSize * 2 ** z;
      const tileHeight = options.tileSize * 2 ** z;
      const dstSrc = path.join(folder, options.cacheFolder, `${options.cacheFilePrefix}-${z}.tiff`);
      const fc = await checkAndLoad(dstSrc, options.clear);
      if (!fc[0]) {
        await fs.ensureFileSync(dstSrc);
      }
      if (fc[0]) {
        // Already cached from a previous run
        cacheByZoom.set(z, fc[1]);
      } else if (i === 0) {
        // Highest zoom: full reproject from original source (handles CRS conversion).
        // Default to bilinear so any upscale is smooth; caller may override via reprojectOptions.
        const targetData = await reproject(['', lastDst, []], dstSrc, {
          resampling: GRA_Bilinear,
          ...(options.reprojectOptions || {}),
          width: tileWidth,
          height: tileHeight,
        });
        cacheByZoom.set(z, targetData);
      } else {
        // Lower zooms: average-downsample from the next-higher cached zoom.
        // Both datasets share the same CRS (3857), so reprojectImageAsync
        // performs a pure resize — no coordinate transformation needed.
        const zAbove = sortedDesc[i - 1];
        const above = cacheByZoom.get(zAbove)!;
        const targetData = await reproject(['', above.data, []], dstSrc, {
          ...(options.reprojectOptions || {}),
          width: tileWidth,
          height: tileHeight,
          resampling: GRA_Average,
          destinationProj4: options.tileProj4,
        });
        cacheByZoom.set(z, targetData);
      }
    }

    // ── Phase 2: Slice tiles from the pyramid ────────────────────────────────
    for (let i = 0; i < zooms.length; i++) {
      const z = zooms[i];
      const targetData = cacheByZoom.get(z)!;
      const tiles = Mercantile.tiles(
        options.tileExtent[0],
        options.tileExtent[1],
        options.tileExtent[2],
        options.tileExtent[3],
        [z],
        options.clipExtent,
      );

      const bands = targetData.data.bands;
      const count = bands.count();

      for (const tile of tiles) {
        const x = tile.getX();
        const y = tile.getY();

        // const bandName: string = isFunction(options.bandName) ? options?.bandName(z, b, info) : options.bandName;
        const bandName = '';
        const tileId = `${bandName ? bandName + '-' : ''}${z}-${x}-${y}`;
        const tilePath = path.join(folder, options.tileFolder, bandName, String(z), String(x), `${y}.tiff`);
        const tileState = await checkAndLoad(tilePath, options.clear, false);
        needPaths.set(tileId, tilePath);
        if (tileState[0]) {
          tilesPath.set(tileId, tilePath);
          continue;
        } else {
          await fs.ensureFileSync(tilePath);
        }
        const bbox = tile.getBBox();

        const startX = x * options.tileSize;
        const endX = (x + 1) * options.tileSize + 1;
        const startY = y * options.tileSize;
        const endY = (y + 1) * options.tileSize + 1;

        const dst = ndarray([], [endX - startX, endY - startY]);

        await fs.ensureFileSync(tilePath);
        const tileDst = await openAsync(
          tilePath,
          'w',
          'GTiff',
          dst.shape[0],
          dst.shape[1],
          isValid(options.bandCount, true) ? options.bandCount : 1,
          options.gray ? GDT_Byte : options.dataType,
        );

        const [west, south, east, north] = [bbox.getLeft(), bbox.getBottom(), bbox.getRight(), bbox.getTop()];
        const t = Affine.translation(west, north);
        const s = Affine.scale((east - west) / dst.shape[0], (south - north) / dst.shape[1]);
        tileDst.geoTransform = t.multiply(s).toGdal();

        tileDst.srs = SpatialReference.fromProj4(options.tileProj4);

        let minmaxExif = '';
        const minmaxByOutBand: Record<number, [number, number]> = {};

        for (let b = 1; b < count + 1; b++) {
          const e = bands.get(b);
          const info = e.getMetadata();

          const largeData = await enlargeData([targetData.path, targetData.data], {
            ...(options.enlargeOptions || {}),
            bandsIndex: b,
          });

          const clipDst = largeData.data.hi(endY, endX).lo(startY, startX);

          for (let j = 0; j < clipDst.shape[0]; ++j) {
            for (let k = 0; k < clipDst.shape[1]; ++k) {
              const v = clipDst.get(j, k);
              dst.set(j, k, v);
            }
          }

          const outBandIdx = info.GRIB_ELEMENT === 'UGRD' ? 1 : info.GRIB_ELEMENT === 'VGRD' ? 2 : b;
          const bd = tileDst.bands.get(outBandIdx);
          const pixel = bd.pixels;
          const [min, max] = calcMinMax(dst.data);

          if (options.gray) {
            floatToGray(dst, min, max);
          }

          if (options.writeExif) {
            minmaxByOutBand[outBandIdx] = [min, max];
            bd.setMetadata({
              ...info,
              min,
              max,
            });
          } else {
            bd.setMetadata({
              ...info,
              min,
              max,
            });
          }

          const imageData = options.gray
            ? ndarray(new Uint8Array(dst.shape[0] * dst.shape[1]), dst.shape)
            : ndarray(new Float32Array(dst.shape[0] * dst.shape[1]), dst.shape);

          for (let j = 0; j < dst.shape[0]; ++j) {
            for (let k = 0; k < dst.shape[1]; ++k) {
              const v = dst.get(j, k);
              imageData.set(j, k, v);
            }
          }
          await pixel.writeArrayAsync({
            x: 0,
            y: 0,
            width: imageData.shape[0],
            height: imageData.shape[1],
            data: imageData,
          });

          tilesPath.set(tileId, tilePath);
        }

        if (options.writeExif) {
          const sortedBandKeys = Object.keys(minmaxByOutBand)
            .map(Number)
            .sort((a, b) => a - b);
          minmaxExif = sortedBandKeys.map((k) => minmaxByOutBand[k].join(',')).join(',');
          tileDst.setMetadata({
            EXIF_ImageDescription: minmaxExif,
          });
        }
        tileDst.flush();
        tileDst.close();
      }
    }

    return {
      path: Array.from(tilesPath, ([_, value]) => value),
      data: tilesPath,
      errorData: diffMap(needPaths, tilesPath),
    };
  } catch (e) {
    console.error(e);
    return {
      path: [],
      data: tilesPath,
      errorData: diffMap(needPaths, tilesPath),
    };
  }
};
