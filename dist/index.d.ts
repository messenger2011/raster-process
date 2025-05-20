import * as gdal_async from 'gdal-async';
import { Dataset, Geometry } from 'gdal-async';
import { NdArray } from 'ndarray';
import { LoggerOptions, DestinationStream, BaseLogger } from 'pino';
import { SonicBoomOpts } from 'sonic-boom';

type IRItem = {
    id: string;
    path: string | Buffer | string[];
    data: Dataset | Map<string, string> | null;
    options: any;
    errorTiles?: any[];
};

interface IReadDataOptions {
    autoClose: boolean;
}
declare class ReadData {
    id: string;
    options: IReadDataOptions;
    private ctx;
    constructor(options?: Partial<IReadDataOptions>);
    run(dataPath: string | Buffer, dst: Dataset, results: any): Promise<(string | Dataset | Buffer | IRItem[])[] | undefined>;
    apply(ctx: any): void;
}

interface IBandsMapping {
    bandCount: number;
    name: string;
    label: string;
    process?: (v: NdArray) => NdArray;
}
interface IWriteOptions {
    clear: boolean;
    width: number;
    height: number;
    dataType: string;
    bandCount: number;
    bandsFunction: (info: any) => boolean | Omit<IBandsMapping, 'bandCount'>;
    gray: boolean;
    drivers: string | string[];
    customProj4: string;
    customExtent: [number, number, number, number];
}

declare class WriteTiff {
    id: string;
    path: string;
    options: any;
    private ctx;
    constructor(path: string, options?: Partial<IWriteOptions>);
    run(data: any, path: any, opt: any): Promise<(string | gdal_async.Dataset | Buffer | IRItem[])[] | undefined>;
    apply(ctx: any): void;
}

interface IReprojectOptions {
    clear: boolean;
    width: number;
    height: number;
    dataType: string;
    bandCount: number;
    drivers: string | string[];
    resampling: string;
    sourceProj4: string;
    threads: number;
    withMetadata: boolean;
    sourceExtent: [number, number, number, number];
    destinationProj4: string;
    destinationExtent: [number, number, number, number];
    cutline?: Geometry;
    srcBands?: number[];
    dstBands?: number[];
    srcAlphaBand?: number;
    dstAlphaBand?: number;
    srcNodata?: number;
    dstNodata?: number;
    blend?: number;
    memoryLimit?: number;
    maxError?: number;
    multi?: boolean;
}

declare class Reproject {
    id: string;
    path: string;
    options: any;
    private ctx;
    constructor(path: string, options?: Partial<IReprojectOptions>);
    run(data: any, path: any, opt: any): Promise<(string | gdal_async.Dataset | Buffer | IRItem[])[] | undefined>;
    apply(ctx: any): void;
}

interface IEnlargeDataOptions {
    offset: number;
    bandsIndex: number;
}

interface IGenerateTileOptions {
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

declare class GenerateTiles {
    id: string;
    folder: string;
    options: any;
    private ctx;
    constructor(folder: string, options?: Partial<IGenerateTileOptions>);
    run(data: any, folder: any, opt: any): Promise<(string[] | Map<string, string> | IRItem[])[] | undefined>;
    apply(ctx: any): void;
}

interface IGenerateJPEGOptions {
    clear: boolean;
    quality: number;
    drivers: string | string[];
    tileFolder: string;
    name: string | ((p: string, t: string, n: string, z?: number, x?: number, y?: number) => string);
}

declare class GenerateJPEG {
    id: string;
    folder: string;
    options: any;
    private ctx;
    constructor(folder: string, options?: Partial<IGenerateJPEGOptions>);
    run(data: any, folder: any, opt: any): Promise<(string | string[] | gdal_async.Dataset | Map<string, string> | IRItem[] | null)[] | undefined>;
    apply(ctx: any): void;
}

interface IGeneratePNGOptions {
    clear: boolean;
    quality: number;
    drivers: string | string[];
    tileFolder: string;
    name: string | ((p: string, t: string, n: string, z?: number, x?: number, y?: number) => string);
}

declare class GeneratePNG {
    id: string;
    folder: string;
    options: any;
    private ctx;
    constructor(folder: string, options?: Partial<IGeneratePNGOptions>);
    run(data: any, folder: any, opt: any): Promise<(string | string[] | gdal_async.Dataset | Map<string, string> | IRItem[] | null)[] | undefined>;
    apply(ctx: any): void;
}

interface IOSSConfig {
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    endpoint: string;
    secure: boolean;
    internal: boolean;
    cname: boolean;
    folder?: string;
    headers?: {
        [key: string]: any;
    };
    pathFunction?: (url: string, folder?: string) => string;
}
declare class UploadOSS {
    id: string;
    config: Partial<IOSSConfig>;
    private ctx;
    private client;
    constructor(config: Partial<IOSSConfig>);
    upload(uri: string): any;
    run(data: any): Promise<any[] | undefined>;
    apply(ctx: any): void;
}

interface IMBTileConfig {
    mode: 'ro' | 'rw' | 'rwc';
}
declare class WriteMBTile {
    id: string;
    config: IMBTileConfig;
    private ctx;
    private mbtiles;
    constructor(sourceUri: string, config: IMBTileConfig);
    putTile(x: number, y: number, z: number, url: any): Promise<boolean>;
    startWriting(): Promise<unknown>;
    stopWriting(): Promise<unknown>;
    run(data: any): Promise<any[] | undefined>;
    apply(ctx: any): void;
}

type ITask = ReadData | WriteTiff | Reproject | GenerateTiles | GenerateJPEG | GeneratePNG | UploadOSS | WriteMBTile;

type task_GenerateJPEG = GenerateJPEG;
declare const task_GenerateJPEG: typeof GenerateJPEG;
type task_GeneratePNG = GeneratePNG;
declare const task_GeneratePNG: typeof GeneratePNG;
type task_GenerateTiles = GenerateTiles;
declare const task_GenerateTiles: typeof GenerateTiles;
type task_ITask = ITask;
type task_ReadData = ReadData;
declare const task_ReadData: typeof ReadData;
type task_Reproject = Reproject;
declare const task_Reproject: typeof Reproject;
type task_UploadOSS = UploadOSS;
declare const task_UploadOSS: typeof UploadOSS;
type task_WriteMBTile = WriteMBTile;
declare const task_WriteMBTile: typeof WriteMBTile;
type task_WriteTiff = WriteTiff;
declare const task_WriteTiff: typeof WriteTiff;
declare namespace task {
  export { task_GenerateJPEG as GenerateJPEG, task_GeneratePNG as GeneratePNG, task_GenerateTiles as GenerateTiles, type task_ITask as ITask, task_ReadData as ReadData, task_Reproject as Reproject, task_UploadOSS as UploadOSS, task_WriteMBTile as WriteMBTile, task_WriteTiff as WriteTiff };
}

declare const addScalar: any;
declare const subScalar: any;
declare const multiplyScalar: any;
declare const divScalar: any;
declare const add: any;
declare const sub: any;
declare const multiply: any;
declare const div: any;
declare const floatToGray: any;

declare const normalizeDataProcess_add: typeof add;
declare const normalizeDataProcess_addScalar: typeof addScalar;
declare const normalizeDataProcess_div: typeof div;
declare const normalizeDataProcess_divScalar: typeof divScalar;
declare const normalizeDataProcess_floatToGray: typeof floatToGray;
declare const normalizeDataProcess_multiply: typeof multiply;
declare const normalizeDataProcess_multiplyScalar: typeof multiplyScalar;
declare const normalizeDataProcess_sub: typeof sub;
declare const normalizeDataProcess_subScalar: typeof subScalar;
declare namespace normalizeDataProcess {
  export { normalizeDataProcess_add as add, normalizeDataProcess_addScalar as addScalar, normalizeDataProcess_div as div, normalizeDataProcess_divScalar as divScalar, normalizeDataProcess_floatToGray as floatToGray, normalizeDataProcess_multiply as multiply, normalizeDataProcess_multiplyScalar as multiplyScalar, normalizeDataProcess_sub as sub, normalizeDataProcess_subScalar as subScalar };
}

interface IConfig {
    name: string;
    log: {
        options: LoggerOptions;
        destination: string | number | SonicBoomOpts | DestinationStream | NodeJS.WritableStream;
    };
    workspace: string;
}

declare const defaultConfig: IConfig;
type IDataPath = string | string[];
type IDataRes = Dataset | string[] | Map<string, string>;
type ITaskResult = [IDataPath, IDataRes, IRItem[]];
declare class RasterProcess {
    static task: typeof task;
    static normalizeDataProcess: typeof normalizeDataProcess;
    logger: BaseLogger;
    config: IConfig & Partial<IConfig>;
    private task;
    constructor(config?: Partial<IConfig>);
    createLogger(): void;
    use(t: ITask): this;
    run(pathSrc: string[], cb?: (err: any, res: ITaskResult) => void): Promise<unknown>;
}

export { type ITaskResult, RasterProcess, defaultConfig, normalizeDataProcess, task };
