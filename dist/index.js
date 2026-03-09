var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  RasterProcess: () => RasterProcess,
  defaultConfig: () => defaultConfig,
  normalizeDataProcess: () => normalizeData_exports,
  task: () => task_exports
});
module.exports = __toCommonJS(src_exports);
var import_tapable = require("tapable");
var import_lodash8 = require("lodash");
var import_pino = __toESM(require("pino"));
var import_fs_extra7 = __toESM(require("fs-extra"));
var import_path5 = __toESM(require("path"));

// src/task/index.ts
var task_exports = {};
__export(task_exports, {
  GenerateJPEG: () => GenerateJPEG_default,
  GeneratePNG: () => GeneratePNG_default,
  GenerateTiles: () => GenerateTiles_default,
  ReadData: () => ReadData_default,
  Reproject: () => Reproject_default,
  UploadOSS: () => UploadOSS_default,
  WriteMBTile: () => WriteMBTile_default,
  WriteTiff: () => WriteTiff_default
});

// src/task/ReadData.ts
var import_gdal_async2 = require("gdal-async");

// src/utils/index.ts
var import_gdal_async = require("gdal-async");
function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}
function getProjFromDataset(ds) {
  var _a;
  if (!ds) return;
  return (_a = ds.srs) == null ? void 0 : _a.toProj4();
}
function getExtentFromDataSet(ds) {
  if (!ds) return;
  const size = ds.rasterSize;
  const geoTransform = ds.geoTransform;
  if (geoTransform && geoTransform.length > 0 && size.x > 0 && size.y > 0) {
    const minx = geoTransform[0];
    const maxy = geoTransform[3];
    const maxx = minx + geoTransform[1] * size.x;
    const miny = maxy + geoTransform[5] * size.y;
    return [minx, miny, maxx, maxy];
  }
  return;
}
function transformPoint(coordinates, source, target) {
  const s = import_gdal_async.SpatialReference.fromProj4(source);
  let x = coordinates[0];
  let y = coordinates[1];
  const z = coordinates[2];
  if (s.isSame(import_gdal_async.SpatialReference.fromProj4("+proj=longlat +R=6371229 +no_defs"))) {
    x = clamp(x, -180, 180);
    y = clamp(x, -90, 90);
  }
  const tr = new import_gdal_async.CoordinateTransformation(
    import_gdal_async.SpatialReference.fromProj4(source),
    import_gdal_async.SpatialReference.fromProj4(target)
  );
  return tr.transformPoint(x, y, z);
}
function transformExtent(extent2, source, target) {
  const leftBottom = [extent2[0], extent2[1]];
  const rightTop = [extent2[2], extent2[3]];
  const p1 = transformPoint(leftBottom, source, target);
  const p2 = transformPoint(rightTop, source, target);
  return [p1.x, p1.y, p2.x, p2.y];
}
function calcMinMax(array) {
  let min = Infinity;
  let max = Infinity;
  for (let i = 0; i < array.length; i++) {
    const val = array[i];
    if (min === Infinity) {
      min = val;
    } else if (max === Infinity) {
      max = val;
      min = Math.min(min, max);
      max = Math.max(min, max);
    } else {
      min = Math.min(val, min);
      max = Math.max(val, max);
    }
  }
  return [min, max];
}
function safePush(array = [], item) {
  let result = array;
  if (!Array.isArray(array)) {
    result = [];
  }
  result.push(item);
  return result;
}
function diffMap(source, target) {
  let testVal;
  const diff = /* @__PURE__ */ new Map();
  for (const [key, val] of source) {
    testVal = target.get(key);
    if (testVal !== val || testVal === void 0 && !target.has(key)) {
      diff.set(key, val);
    }
  }
  return diff;
}
function isValid(val, checkString = false) {
  let f = val !== null && val !== void 0 && !isNaN(val) && val !== Infinity;
  if (checkString) {
    f = f && val !== "";
  }
  return f;
}
function filterOptions(options = {}, filterValue) {
  const keys = Object.keys(options).filter((key) => options[key] !== filterValue);
  return keys.reduce(
    (prev, cur) => __spreadProps(__spreadValues({}, prev), {
      [cur]: options[cur]
    }),
    {}
  );
}

// src/task/ReadData.ts
var defaultOptions = {
  autoClose: false
};
var ReadData = class {
  constructor(options = {}) {
    this.id = "ReadDataTask";
    this.options = __spreadValues(__spreadValues({}, defaultOptions), options);
  }
  async run(dataPath, dst, results) {
    try {
      const data = await (0, import_gdal_async2.openAsync)(dataPath);
      process.nextTick(() => {
        if (this.options.autoClose) {
          data.close();
        }
      });
      return [
        dataPath,
        data,
        safePush(results, {
          id: this.id,
          path: dataPath,
          data,
          options: this.options
        })
      ];
    } catch (e) {
      console.error(`[${this.id}]: ${e.toString()}`);
      this.ctx.logger.error(`[${this.id}]: ${e.toString()}`);
    }
  }
  apply(ctx) {
    this.ctx = ctx;
    ctx.task.tapPromise(this.id, (res) => this.run(res[0], res[1], res[2]));
  }
};
var ReadData_default = ReadData;

// src/process/writeTiff.ts
var import_fs_extra = __toESM(require("fs-extra"));
var import_lodash = require("lodash");
var import_affine = __toESM(require("@sakitam-gis/affine"));
var import_gdal_async3 = require("gdal-async");
var import_ndarray_gdal = require("ndarray-gdal");

// src/process/normalizeData.ts
var normalizeData_exports = {};
__export(normalizeData_exports, {
  add: () => add,
  addScalar: () => addScalar,
  div: () => div,
  divScalar: () => divScalar,
  floatToGray: () => floatToGray,
  multiply: () => multiply,
  multiplyScalar: () => multiplyScalar,
  sub: () => sub,
  subScalar: () => subScalar
});
var import_cwise = __toESM(require("cwise"));
var addScalar = (0, import_cwise.default)({
  args: ["array", "scalar"],
  body: function(a, s) {
    a += s;
  }
});
var subScalar = (0, import_cwise.default)({
  args: ["array", "scalar"],
  body: function(a, s) {
    a -= s;
  }
});
var multiplyScalar = (0, import_cwise.default)({
  args: ["array", "scalar"],
  body: function(a, s) {
    a *= s;
  }
});
var divScalar = (0, import_cwise.default)({
  args: ["array", "scalar"],
  body: function(a, s) {
    a /= s;
  }
});
var add = (0, import_cwise.default)({
  args: ["array", "array"],
  body: function(a, s) {
    a += s;
  }
});
var sub = (0, import_cwise.default)({
  args: ["array", "array"],
  body: function(a, s) {
    a -= s;
  }
});
var multiply = (0, import_cwise.default)({
  args: ["array", "array"],
  body: function(a, s) {
    a *= s;
  }
});
var div = (0, import_cwise.default)({
  args: ["array", "array"],
  body: function(a, s) {
    a /= s;
  }
});
var floatToGray = (0, import_cwise.default)({
  args: ["array", "scalar", "scalar"],
  body: function(a, min, max) {
    a = (a - min) / (max - min) * 255;
  }
});

// src/process/writeTiff.ts
var defaultOptions2 = {
  clear: true,
  drivers: "GTiff",
  gray: false,
  bandCount: 1,
  bandsFunction: () => true,
  dataType: import_gdal_async3.GDT_Float32
};
var writeTiff_default = async (data, dstPath, opt = {}) => {
  try {
    const options = (0, import_lodash.merge)({}, defaultOptions2, opt);
    const stat = await import_fs_extra.default.pathExists(dstPath);
    if (!options.clear) {
      if (stat) {
        return {
          path: dstPath,
          data: await (0, import_gdal_async3.openAsync)(dstPath)
        };
      }
    } else {
      if (stat) {
        await import_fs_extra.default.removeSync(dstPath);
      }
    }
    let lastDst = data[1];
    if (!lastDst && data[0]) {
      lastDst = await (0, import_gdal_async3.openAsync)(data[0]);
    }
    const bands = lastDst.bands;
    const size = lastDst.rasterSize;
    const count = bands.count();
    const bandsMapping = [];
    for (let i = 1; i < count + 1; i++) {
      const e = bands.get(i);
      const info = e.getMetadata();
      const cfg = options.bandsFunction(info);
      if (cfg) {
        const mergeConfig = (0, import_lodash.isObject)(cfg) ? cfg : {};
        bandsMapping.push(__spreadValues({
          bandCount: i
        }, mergeConfig));
      }
    }
    await import_fs_extra.default.ensureFileSync(dstPath);
    const dst = await (0, import_gdal_async3.openAsync)(
      dstPath,
      "w",
      options.drivers,
      size.x || options.width,
      size.y || options.height,
      bandsMapping.length || options.bandCount,
      options.dataType
    );
    let srs = lastDst.srs;
    let geoTransform = lastDst.geoTransform;
    if (options.customProj4) {
      srs = import_gdal_async3.SpatialReference.fromProj4(options.customProj4);
    }
    if (options.customExtent) {
      const [west, south, east, north] = options.customExtent;
      const t = import_affine.default.translation(west, north);
      const s = import_affine.default.scale(
        (east - west) / (options.width !== void 0 ? options.width : size.x),
        (south - north) / (options.height !== void 0 ? options.height : size.y)
      );
      geoTransform = t.multiply(s).toGdal();
    }
    dst.srs = srs;
    dst.geoTransform = geoTransform;
    for (let j = 0; j < bandsMapping.length; j++) {
      const config = bandsMapping[j];
      const e = bands.get(config.bandCount);
      const info = e.getMetadata();
      const pixelsData = await e.pixels.readArrayAsync();
      if ((0, import_lodash.isFunction)(config.process)) {
        config.process(pixelsData);
      }
      const [min, max] = calcMinMax(pixelsData.data);
      if (options.gray) {
        floatToGray(pixelsData, min, max);
      }
      const targetBand = dst.bands.get(j + 1);
      if (targetBand) {
        const pixel = targetBand.pixels;
        await targetBand.setMetadataAsync(__spreadValues({
          min,
          max
        }, info));
        await pixel.writeArrayAsync({
          data: pixelsData
        });
      }
    }
    return {
      path: dstPath,
      data: dst
    };
  } catch (e) {
    console.error("[writeTiff]: ", e);
  }
};

// src/task/WriteTiff.ts
var WriteTiff = class {
  constructor(path6, options = {}) {
    this.id = "WriteTiffTask";
    this.path = path6;
    this.options = options;
  }
  async run(data, path6, opt) {
    try {
      const res = await writeTiff_default(data, path6, opt);
      if (res) {
        return [
          res.path,
          res.data,
          safePush(data[2], {
            id: this.id,
            path: res.path,
            data: res.data,
            options: this.options
          })
        ];
      }
    } catch (e) {
      this.ctx.logger.error(`[${this.id}]: ${e.toString()}`);
    }
  }
  apply(ctx) {
    this.ctx = ctx;
    ctx.task.tapPromise(this.id, (data) => this.run(data, this.path, this.options));
  }
};
var WriteTiff_default = WriteTiff;

// src/process/reproject.ts
var import_os = __toESM(require("os"));
var import_fs_extra2 = __toESM(require("fs-extra"));
var import_lodash2 = require("lodash");
var import_affine2 = __toESM(require("@sakitam-gis/affine"));
var import_gdal_async4 = require("gdal-async");

// src/config.ts
var extent = [-180, -90, 180, 90];
var mercatorLngLatExtent = [-180, -85.05112877980659, 180, 85.05112877980659];
var mercatorExtent = [
  -20037508342789244e-9,
  -20037508342789255e-9,
  20037508342789244e-9,
  20037508342789244e-9
];

// src/process/reproject.ts
var defaultOptions3 = {
  width: 256,
  height: 256,
  clear: true,
  drivers: "GTiff",
  withMetadata: true,
  dataType: import_gdal_async4.GDT_Float32,
  resampling: import_gdal_async4.GRA_NearestNeighbor,
  sourceProj4: "+proj=longlat +datum=WGS84 +no_defs +type=crs",
  // 4326
  sourceExtent: extent,
  destinationProj4: "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs",
  // 3857
  destinationExtent: mercatorExtent
};
var cpus = import_os.default.cpus().length;
var reproject_default = async (data, dstPath, opt = {}) => {
  const options = (0, import_lodash2.merge)({}, defaultOptions3, opt);
  const stat = await import_fs_extra2.default.pathExists(dstPath);
  if (!options.clear) {
    if (stat) {
      return {
        path: dstPath,
        data: await (0, import_gdal_async4.openAsync)(dstPath)
      };
    }
  } else {
    if (stat) {
      await import_fs_extra2.default.removeSync(dstPath);
    }
  }
  let lastDst = data[1];
  if (!lastDst && data[0]) {
    lastDst = await (0, import_gdal_async4.openAsync)(data[0]);
  }
  await import_fs_extra2.default.ensureFileSync(dstPath);
  const dst = await (0, import_gdal_async4.openAsync)(
    dstPath,
    "w",
    options.drivers,
    options.width,
    options.height,
    isValid(options.bandCount, true) ? options.bandCount : lastDst.bands.count(),
    options.dataType
  );
  let [west, south, east, north] = options.destinationExtent || [];
  if (!options.destinationExtent || options.destinationExtent.length < 4) {
    const bbox = getExtentFromDataSet(lastDst);
    if (bbox && bbox.length === 4) {
      const source = getProjFromDataset(lastDst) || options.sourceProj4;
      [west, south, east, north] = transformExtent(bbox, source, options.destinationProj4);
    }
  }
  dst.srs = import_gdal_async4.SpatialReference.fromProj4(options.destinationProj4);
  const t = import_affine2.default.translation(west, north);
  const s = import_affine2.default.scale((east - west) / options.width, (south - north) / options.height);
  dst.geoTransform = t.multiply(s).toGdal();
  await (0, import_gdal_async4.reprojectImageAsync)(__spreadProps(__spreadValues({
    src: lastDst,
    dst,
    s_srs: lastDst.srs,
    t_srs: dst.srs,
    // http://naturalatlas.github.io/node-gdal/classes/Constants%20(GRA).html
    resampling: options.resampling
  }, filterOptions(
    {
      srcBands: options.srcBands,
      dstBands: options.dstBands,
      srcAlphaBand: options.srcAlphaBand,
      dstAlphaBand: options.dstAlphaBand,
      srcNodata: options.srcNodata,
      dstNodata: options.dstNodata
    },
    void 0
  )), {
    options: {
      NUM_THREADS: options.threads || cpus.toString()
    }
  }));
  if (options.withMetadata) {
    const bands = lastDst.bands;
    const count = bands.count();
    for (let i = 1; i < count + 1; i++) {
      const e = bands.get(i);
      const info = e.getMetadata();
      const targetBand = dst.bands.get(i);
      if (targetBand) {
        await targetBand.setMetadataAsync(info);
      }
    }
  }
  return {
    path: dstPath,
    data: dst
  };
};

// src/task/Reproject.ts
var Reproject = class {
  constructor(path6, options = {}) {
    this.id = "ReprojectTask";
    this.options = options;
    this.path = path6;
  }
  async run(data, path6, opt) {
    try {
      const res = await reproject_default(data, path6, opt);
      return [
        res.path,
        res.data,
        safePush(data[2], {
          id: this.id,
          path: res.path,
          data: res.data,
          options: opt
        })
      ];
    } catch (e) {
      this.ctx.logger.error(`[${this.id}]: ${e.toString()}`);
    }
  }
  apply(ctx) {
    this.ctx = ctx;
    ctx.task.tapPromise(this.id, (data) => this.run(data, this.path, this.options));
  }
};
var Reproject_default = Reproject;

// src/process/generateTiles.ts
var import_fs_extra3 = __toESM(require("fs-extra"));
var import_path = __toESM(require("path"));
var import_lodash4 = require("lodash");
var import_affine3 = __toESM(require("@sakitam-gis/affine"));
var import_mercantile = require("@sakitam-gis/mercantile");
var import_gdal_async6 = require("gdal-async");
var import_ndarray_gdal3 = require("ndarray-gdal");
var import_ndarray2 = __toESM(require("ndarray"));

// src/process/enlargeData.ts
var import_lodash3 = require("lodash");
var import_gdal_async5 = require("gdal-async");
var import_ndarray_gdal2 = require("ndarray-gdal");
var import_ndarray = __toESM(require("ndarray"));
var import_ndarray_concat_rows = __toESM(require("ndarray-concat-rows"));
var import_ndarray_concat_cols = __toESM(require("ndarray-concat-cols"));
var defaultOptions4 = {
  offset: 1,
  bandsIndex: 1
};
async function enlargeData(data, opt = {}) {
  const options = (0, import_lodash3.merge)({}, defaultOptions4, opt);
  let lastDst = data[1];
  if (!lastDst && data[0]) {
    lastDst = await (0, import_gdal_async5.openAsync)(data[0]);
  }
  const e = lastDst.bands.get(options.bandsIndex);
  const pixelsData = e.pixels.readArray({
    width: e.size.x,
    height: e.size.y
  });
  const rowDst = (0, import_ndarray.default)([], [options.offset, pixelsData.shape[1]]);
  const row = pixelsData.lo(pixelsData.shape[1] - options.offset, 0);
  for (let i = 0; i < row.shape[0]; ++i) {
    for (let j = 0; j < row.shape[1]; ++j) {
      const v = row.get(i, j);
      rowDst.set(i, j, v);
    }
  }
  const d = (0, import_ndarray_concat_rows.default)([pixelsData, rowDst]);
  const colDst = (0, import_ndarray.default)([], [d.shape[0], options.offset]);
  const col = d.hi(d.shape[0], options.offset);
  for (let i = 0; i < col.shape[0]; ++i) {
    for (let j = 0; j < col.shape[1]; ++j) {
      const v = col.get(i, j);
      colDst.set(i, j, v);
    }
  }
  return {
    path: data[0],
    data: (0, import_ndarray_concat_cols.default)([colDst, d])
  };
}

// src/process/generateTiles.ts
var defaultOptions5 = {
  clear: true,
  drivers: "GTiff",
  bandCount: 1,
  tileSize: 256,
  gray: false,
  clipExtent: false,
  tileExtent: mercatorLngLatExtent,
  zooms: [0, 5, 1],
  // start,end,step
  dataType: import_gdal_async6.GDT_Float32,
  bandName: (zoom, band, info) => info.GRIB_ELEMENT,
  tileFolder: "tiles",
  cacheFolder: "cache",
  cacheFilePrefix: "mercator",
  tileProj4: "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs"
  // 3857
};
async function checkAndLoad(p, clear = false, load = true) {
  try {
    const stat = await import_fs_extra3.default.pathExists(p);
    if (!clear) {
      if (stat) {
        return load ? [
          true,
          {
            path: p,
            data: await (0, import_gdal_async6.openAsync)(p)
          }
        ] : [true];
      }
      return [false];
    } else {
      if (stat) {
        await import_fs_extra3.default.removeSync(p);
      }
      return [false];
    }
  } catch (e) {
    console.error(e);
  }
}
var generateTiles_default = async (data, folder, opt = {}) => {
  const options = (0, import_lodash4.merge)({}, defaultOptions5, opt);
  const tilesPath = /* @__PURE__ */ new Map();
  const needPaths = /* @__PURE__ */ new Map();
  try {
    let lastDst = data[1];
    if (!lastDst && data[0]) {
      lastDst = await (0, import_gdal_async6.openAsync)(data[0]);
    }
    const zooms = Array.isArray(options.zooms) ? import_mercantile.Constant.range(options.zooms[0], options.zooms[1], options.zooms[2]) : import_mercantile.Constant.range(options.zooms);
    const sortedDesc = [...zooms].sort((a, b) => b - a);
    const cacheByZoom = /* @__PURE__ */ new Map();
    for (let i = 0; i < sortedDesc.length; i++) {
      const z = sortedDesc[i];
      const tileWidth = options.tileSize * 2 ** z;
      const tileHeight = options.tileSize * 2 ** z;
      const dstSrc = import_path.default.join(folder, options.cacheFolder, `${options.cacheFilePrefix}-${z}.tiff`);
      const fc = await checkAndLoad(dstSrc, options.clear);
      if (!fc[0]) {
        await import_fs_extra3.default.ensureFileSync(dstSrc);
      }
      if (fc[0]) {
        cacheByZoom.set(z, fc[1]);
      } else if (i === 0) {
        const targetData = await reproject_default(["", lastDst, []], dstSrc, __spreadProps(__spreadValues({
          resampling: import_gdal_async6.GRA_Bilinear
        }, options.reprojectOptions || {}), {
          width: tileWidth,
          height: tileHeight
        }));
        cacheByZoom.set(z, targetData);
      } else {
        const zAbove = sortedDesc[i - 1];
        const above = cacheByZoom.get(zAbove);
        const targetData = await reproject_default(["", above.data, []], dstSrc, __spreadProps(__spreadValues({}, options.reprojectOptions || {}), {
          width: tileWidth,
          height: tileHeight,
          resampling: import_gdal_async6.GRA_Average,
          destinationProj4: options.tileProj4
        }));
        cacheByZoom.set(z, targetData);
      }
    }
    for (let i = 0; i < zooms.length; i++) {
      const z = zooms[i];
      const targetData = cacheByZoom.get(z);
      const tiles = import_mercantile.Mercantile.tiles(
        options.tileExtent[0],
        options.tileExtent[1],
        options.tileExtent[2],
        options.tileExtent[3],
        [z],
        options.clipExtent
      );
      const bands = targetData.data.bands;
      const count = bands.count();
      for (const tile of tiles) {
        const x = tile.getX();
        const y = tile.getY();
        const bandName = "";
        const tileId = `${bandName ? bandName + "-" : ""}${z}-${x}-${y}`;
        const tilePath = import_path.default.join(folder, options.tileFolder, bandName, String(z), String(x), `${y}.tiff`);
        const tileState = await checkAndLoad(tilePath, options.clear, false);
        needPaths.set(tileId, tilePath);
        if (tileState[0]) {
          tilesPath.set(tileId, tilePath);
          continue;
        } else {
          await import_fs_extra3.default.ensureFileSync(tilePath);
        }
        const bbox = tile.getBBox();
        const startX = x * options.tileSize;
        const endX = (x + 1) * options.tileSize + 1;
        const startY = y * options.tileSize;
        const endY = (y + 1) * options.tileSize + 1;
        const dst = (0, import_ndarray2.default)([], [endX - startX, endY - startY]);
        await import_fs_extra3.default.ensureFileSync(tilePath);
        const tileDst = await (0, import_gdal_async6.openAsync)(
          tilePath,
          "w",
          "GTiff",
          dst.shape[0],
          dst.shape[1],
          isValid(options.bandCount, true) ? options.bandCount : 1,
          options.gray ? import_gdal_async6.GDT_Byte : options.dataType
        );
        const [west, south, east, north] = [bbox.getLeft(), bbox.getBottom(), bbox.getRight(), bbox.getTop()];
        const t = import_affine3.default.translation(west, north);
        const s = import_affine3.default.scale((east - west) / dst.shape[0], (south - north) / dst.shape[1]);
        tileDst.geoTransform = t.multiply(s).toGdal();
        tileDst.srs = import_gdal_async6.SpatialReference.fromProj4(options.tileProj4);
        let minmaxExif = "";
        const minmaxByOutBand = {};
        for (let b = 1; b < count + 1; b++) {
          const e = bands.get(b);
          const info = e.getMetadata();
          const largeData = await enlargeData([targetData.path, targetData.data], __spreadProps(__spreadValues({}, options.enlargeOptions || {}), {
            bandsIndex: b
          }));
          const clipDst = largeData.data.hi(endY, endX).lo(startY, startX);
          for (let j = 0; j < clipDst.shape[0]; ++j) {
            for (let k = 0; k < clipDst.shape[1]; ++k) {
              const v = clipDst.get(j, k);
              dst.set(j, k, v);
            }
          }
          const outBandIdx = info.GRIB_ELEMENT === "UGRD" ? 1 : info.GRIB_ELEMENT === "VGRD" ? 2 : b;
          const bd = tileDst.bands.get(outBandIdx);
          const pixel = bd.pixels;
          const [min, max] = calcMinMax(dst.data);
          if (options.gray) {
            floatToGray(dst, min, max);
          }
          if (options.writeExif) {
            minmaxByOutBand[outBandIdx] = [min, max];
            bd.setMetadata(__spreadProps(__spreadValues({}, info), {
              min,
              max
            }));
          } else {
            bd.setMetadata(__spreadProps(__spreadValues({}, info), {
              min,
              max
            }));
          }
          const imageData = options.gray ? (0, import_ndarray2.default)(new Uint8Array(dst.shape[0] * dst.shape[1]), dst.shape) : (0, import_ndarray2.default)(new Float32Array(dst.shape[0] * dst.shape[1]), dst.shape);
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
            data: imageData
          });
          tilesPath.set(tileId, tilePath);
        }
        if (options.writeExif) {
          const sortedBandKeys = Object.keys(minmaxByOutBand).map(Number).sort((a, b) => a - b);
          minmaxExif = sortedBandKeys.map((k) => minmaxByOutBand[k].join(",")).join(",");
          tileDst.setMetadata({
            EXIF_ImageDescription: minmaxExif
          });
        }
        tileDst.flush();
        tileDst.close();
      }
    }
    return {
      path: Array.from(tilesPath, ([_, value]) => value),
      data: tilesPath,
      errorData: diffMap(needPaths, tilesPath)
    };
  } catch (e) {
    console.error(e);
    return {
      path: [],
      data: tilesPath,
      errorData: diffMap(needPaths, tilesPath)
    };
  }
};

// src/task/GenerateTiles.ts
var GenerateTiles = class {
  constructor(folder, options = {}) {
    this.id = "GenerateTilesTask";
    this.folder = folder;
    this.options = options;
  }
  async run(data, folder, opt) {
    try {
      const res = await generateTiles_default(data, folder, opt);
      return [
        res.path,
        res.data,
        safePush(data[2], {
          id: this.id,
          path: res.path,
          data: res.data,
          options: this.options
        })
      ];
    } catch (e) {
      this.ctx.logger.error(`[${this.id}]: ${e.toString()}`);
    }
  }
  apply(ctx) {
    this.ctx = ctx;
    ctx.task.tapPromise(this.id, (data) => this.run(data, this.folder, this.options));
  }
};
var GenerateTiles_default = GenerateTiles;

// src/process/generateJPEG.ts
var import_path2 = __toESM(require("path"));
var import_fs_extra4 = __toESM(require("fs-extra"));
var import_lodash5 = require("lodash");
var import_gdal_async7 = require("gdal-async");
var defaultOptions6 = {
  clear: true,
  drivers: "JPEG",
  tileFolder: "jpeg",
  quality: 90
};
async function process2(data, tilePath, options) {
  const stat = await import_fs_extra4.default.pathExists(tilePath);
  if (!options.clear) {
    if (stat) {
      return {
        path: tilePath,
        data: await (0, import_gdal_async7.openAsync)(tilePath)
      };
    }
  } else {
    if (stat) {
      await import_fs_extra4.default.removeSync(tilePath);
    }
  }
  let lastDst = data[1];
  if (!lastDst && data[0]) {
    lastDst = await (0, import_gdal_async7.openAsync)(data[0]);
  }
  await import_fs_extra4.default.ensureFileSync(tilePath);
  const driver = import_gdal_async7.drivers.get(options.drivers);
  const jpegDst = await driver.createCopyAsync(
    tilePath,
    lastDst,
    {
      TYPE: "Byte",
      QUALITY: options.quality
    },
    false
  );
  await jpegDst.flushAsync();
  lastDst.close();
  return {
    path: tilePath,
    data: jpegDst
  };
}
var generateJPEG_default = async (data, folder, opt = {}) => {
  const options = (0, import_lodash5.merge)({}, defaultOptions6, opt);
  let res = {
    path: "",
    data: null
  };
  try {
    if (Array.isArray(data[0]) && data[1] instanceof Map) {
      const tiles = Array.from(data[1], ([key, value]) => ({ key, value }));
      const tilesPath = /* @__PURE__ */ new Map();
      for (let i = 0; i < tiles.length; i++) {
        const { key, value } = tiles[i];
        const keys = key.split("-");
        let [bandName, z, x, y] = [];
        if (keys.length === 4) {
          [bandName, z, x, y] = keys;
        } else if (keys.length === 3) {
          bandName = "";
          [z, x, y] = keys;
        }
        const tilePath = (0, import_lodash5.isFunction)(options.name) ? options.name(folder, options.tileFolder, bandName, z, x, y) : import_path2.default.join(folder, options.tileFolder, bandName, String(z), String(x), `${y}.jpeg`);
        const r2 = await process2([value], tilePath, options);
        tilesPath.set(key, r2.path);
      }
      res = {
        path: Array.from(tilesPath, ([_, value]) => value),
        data: tilesPath
      };
    } else {
      const ext = import_path2.default.extname(data[0]);
      const name = import_path2.default.basename(data[0]);
      const nm = name.replace(new RegExp(ext + "$"), "");
      const filePath = (0, import_lodash5.isFunction)(options.name) ? options.name(folder, options.tileFolder, nm) : import_path2.default.join(folder, options.tileFolder, `${nm}.jpeg`);
      res = await process2([data[0]], filePath, options);
    }
    return res;
  } catch (e) {
    console.error(e);
    return {
      path: "",
      data: null
    };
  }
};

// src/task/GenerateJPEG.ts
var GenerateJPEG = class {
  constructor(folder, options = {}) {
    this.id = "GenerateJPEGTask";
    this.folder = folder;
    this.options = options;
  }
  async run(data, folder, opt) {
    try {
      const res = await generateJPEG_default(data, folder, opt);
      return [
        res.path,
        res.data,
        safePush(data[2], {
          id: this.id,
          path: res.path,
          data: res.data,
          options: this.options
        })
      ];
    } catch (e) {
      this.ctx.logger.error(`[${this.id}]: ${e.toString()}`);
    }
  }
  apply(ctx) {
    this.ctx = ctx;
    ctx.task.tapPromise(this.id, (data) => this.run(data, this.folder, this.options));
  }
};
var GenerateJPEG_default = GenerateJPEG;

// src/process/generatePNG.ts
var import_path3 = __toESM(require("path"));
var import_fs_extra5 = __toESM(require("fs-extra"));
var import_lodash6 = require("lodash");
var import_gdal_async8 = require("gdal-async");
var defaultOptions7 = {
  clear: true,
  drivers: "PNG",
  tileFolder: "png",
  quality: 90
};
async function process3(data, tilePath, options) {
  const stat = await import_fs_extra5.default.pathExists(tilePath);
  if (!options.clear) {
    if (stat) {
      return {
        path: tilePath,
        data: await (0, import_gdal_async8.openAsync)(tilePath)
      };
    }
  } else {
    if (stat) {
      await import_fs_extra5.default.removeSync(tilePath);
    }
  }
  let lastDst = data[1];
  if (!lastDst && data[0]) {
    lastDst = await (0, import_gdal_async8.openAsync)(data[0]);
  }
  await import_fs_extra5.default.ensureFileSync(tilePath);
  const driver = import_gdal_async8.drivers.get(options.drivers);
  const pngDst = await driver.createCopyAsync(
    tilePath,
    lastDst,
    {
      TYPE: "Byte",
      QUALITY: options.quality
    },
    false
  );
  await pngDst.flushAsync();
  lastDst.close();
  return {
    path: tilePath,
    data: pngDst
  };
}
var generatePNG_default = async (data, folder, opt = {}) => {
  const options = (0, import_lodash6.merge)({}, defaultOptions7, opt);
  let res = {
    path: "",
    data: null
  };
  try {
    if (Array.isArray(data[0]) && data[1] instanceof Map) {
      const tiles = Array.from(data[1], ([key, value]) => ({ key, value }));
      const tilesPath = /* @__PURE__ */ new Map();
      for (let i = 0; i < tiles.length; i++) {
        const { key, value } = tiles[i];
        const keys = key.split("-");
        let [bandName, z, x, y] = [];
        if (keys.length === 4) {
          [bandName, z, x, y] = keys;
        } else if (keys.length === 3) {
          bandName = "";
          [z, x, y] = keys;
        }
        const tilePath = (0, import_lodash6.isFunction)(options.name) ? options.name(folder, options.tileFolder, bandName, z, x, y) : import_path3.default.join(folder, options.tileFolder, bandName, String(z), String(x), `${y}.png`);
        const r2 = await process3([value], tilePath, options);
        tilesPath.set(key, r2.path);
      }
      res = {
        path: Array.from(tilesPath, ([_, value]) => value),
        data: tilesPath
      };
    } else {
      const ext = import_path3.default.extname(data[0]);
      const name = import_path3.default.basename(data[0]);
      const nm = name.replace(new RegExp(ext + "$"), "");
      const filePath = (0, import_lodash6.isFunction)(options.name) ? options.name(folder, options.tileFolder, nm) : import_path3.default.join(folder, options.tileFolder, `${nm}.png`);
      res = await process3(data, filePath, options);
    }
    return res;
  } catch (e) {
    console.error(e);
    return {
      path: "",
      data: null
    };
  }
};

// src/task/GeneratePNG.ts
var GeneratePNG = class {
  constructor(folder, options = {}) {
    this.id = "GeneratePNGTask";
    this.folder = folder;
    this.options = options;
  }
  async run(data, folder, opt) {
    try {
      const res = await generatePNG_default(data, folder, opt);
      return [
        res.path,
        res.data,
        safePush(data[2], {
          id: this.id,
          path: res.path,
          data: res.data,
          options: this.options
        })
      ];
    } catch (e) {
      this.ctx.logger.error(`[${this.id}]: ${e.toString()}`);
    }
  }
  apply(ctx) {
    this.ctx = ctx;
    ctx.task.tapPromise(this.id, (data) => this.run(data, this.folder, this.options));
  }
};
var GeneratePNG_default = GeneratePNG;

// src/task/UploadOSS.ts
var import_ali_oss = __toESM(require("ali-oss"));
var import_path4 = __toESM(require("path"));
var import_lodash7 = require("lodash");
var UploadOSS = class {
  constructor(config) {
    this.id = "UploadOSSTask";
    this.config = config;
    this.client = new import_ali_oss.default(__spreadValues({}, (0, import_lodash7.omit)(config, ["headers", "pathFunction", "folder"])));
  }
  upload(uri) {
    let storeUrl = uri;
    if ((0, import_lodash7.isFunction)(this.config.pathFunction)) {
      storeUrl = this.config.pathFunction(uri, this.config.folder);
    }
    return this.client.put(storeUrl, import_path4.default.normalize(uri), {
      headers: this.config.headers
    });
  }
  async run(data) {
    try {
      const res = {
        path: [],
        data: null
      };
      if ((0, import_lodash7.isArray)(data[0])) {
        const urls = [];
        for (let i = 0; i < data[0].length; i++) {
          const item = data[0][i];
          const d = await this.upload(item);
          urls.push({
            name: d.name,
            url: d.url,
            origin: item
          });
        }
        res.path = urls.map((u) => u.url);
        res.data = urls;
      } else {
        const d = await this.upload(data[0]);
        res.path = d.url;
        res.data = {
          name: d.name,
          url: d.url,
          origin: data[0]
        };
      }
      return [
        res.path,
        res.data,
        safePush(data[2], {
          id: this.id,
          path: res.path,
          data: res.data,
          options: this.config
        })
      ];
    } catch (e) {
      this.ctx.logger.error(`[${this.id}]: ${e.toString()}`);
    }
  }
  apply(ctx) {
    this.ctx = ctx;
    ctx.task.tapPromise(this.id, (data) => this.run(data));
  }
};
var UploadOSS_default = UploadOSS;

// src/task/WriteMBTile.ts
var import_mbtiles = __toESM(require("@mapbox/mbtiles"));
var import_fs_extra6 = __toESM(require("fs-extra"));
var WriteMBTile = class {
  constructor(sourceUri, config) {
    this.id = "WriteMBTileTask";
    this.config = config;
    import_fs_extra6.default.ensureFileSync(sourceUri);
    this.mbtiles = new import_mbtiles.default(`${sourceUri}?mode=${this.config.mode}`, (err) => {
      if (err) {
        this.ctx.logger.error(`[${this.id}]: ${err.toString()}`);
      } else {
        this.ctx.logger.info(`[${this.id}]: open mbtile success`);
      }
    });
  }
  putTile(x, y, z, url) {
    return new Promise((resolve, reject) => {
      const buffer = import_fs_extra6.default.readFileSync(url);
      this.mbtiles.putTile(x, y, z, buffer, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
  startWriting() {
    return new Promise((resolve, reject) => {
      this.mbtiles.startWriting((err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
  stopWriting() {
    return new Promise((resolve, reject) => {
      this.mbtiles.stopWriting((err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
  async run(data) {
    try {
      const res = {
        path: data[0],
        data: data[1]
      };
      const errorTiles = [];
      const state = await this.startWriting();
      if (state) {
        if (Array.isArray(data[0]) && data[1] instanceof Map) {
          const tiles = Array.from(data[1], ([key, value]) => ({ key, value }));
          for (let i = 0; i < tiles.length; i++) {
            const { key, value } = tiles[i];
            const [_, z, x, y] = key.split("-");
            const r2 = await this.putTile(x, y, z, value);
            if (!r2) {
              errorTiles.push({
                key,
                value
              });
            }
          }
        } else {
          const d = await this.putTile(0, 0, 0, data[0]);
          if (!d) {
            errorTiles.push({
              key: data[0],
              value: data[1]
            });
          }
        }
        await this.stopWriting();
      }
      return [
        res.path,
        res.data,
        safePush(data[2], {
          errorTiles,
          id: this.id,
          path: res.path,
          data: res.data,
          options: this.config
        })
      ];
    } catch (e) {
      this.ctx.logger.error(`[${this.id}]: ${e.toString()}`);
    }
  }
  apply(ctx) {
    this.ctx = ctx;
    ctx.task.tapPromise(this.id, (data) => this.run(data));
  }
};
var WriteMBTile_default = WriteMBTile;

// src/index.ts
var defaultConfig = {
  name: "raster-process",
  log: {
    options: {},
    destination: ""
  },
  workspace: process.cwd()
};
var RasterProcess = class {
  constructor(config) {
    this.config = (0, import_lodash8.merge)({}, defaultConfig, config || {});
    this.createLogger();
    this.task = new import_tapable.AsyncSeriesWaterfallHook(["arg1"]);
    this.task.intercept({
      register: (tapInfo) => {
        this.logger.info(`${tapInfo.name} is register`);
        return tapInfo;
      }
    });
  }
  createLogger() {
    var _a, _b;
    const data = /* @__PURE__ */ new Date();
    const destination = `./logs/{name}-${data.getFullYear()}-${data.getMonth() + 1}-${data.getDate()}.log`.replace(
      "{name}",
      this.config.name
    );
    const targetLog = import_path5.default.resolve(this.config.workspace, ((_a = this.config.log) == null ? void 0 : _a.destination) || destination);
    import_fs_extra7.default.ensureFileSync(targetLog);
    this.logger = (0, import_pino.default)(((_b = this.config.log) == null ? void 0 : _b.options) || {}, import_pino.default.destination(targetLog));
  }
  use(t) {
    t.apply(this);
    return this;
  }
  run(pathSrc, cb) {
    return new Promise((resolve, reject) => {
      this.task.callAsync(pathSrc, (err, res) => {
        if (err) {
          this.logger.error("task fail", err);
          reject(err);
        } else {
          this.logger.info("all task done");
          resolve(res);
        }
        if ((0, import_lodash8.isFunction)(cb)) {
          cb(err, res);
        }
      });
    });
  }
};
RasterProcess.task = task_exports;
RasterProcess.normalizeDataProcess = normalizeData_exports;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RasterProcess,
  defaultConfig,
  normalizeDataProcess,
  task
});
//# sourceMappingURL=index.js.map