"use strict";
/**
 * Copyright © 2022 650 Industries.
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Fork with bundle splitting and better source map support.
 * https://github.com/facebook/metro/blob/bbdd7d7c5e6e0feb50a9967ffae1f723c1d7c4e8/packages/metro/src/DeltaBundler/Serializers/baseJSBundle.js#L1
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseJSBundleWithDependencies = exports.baseJSBundle = exports.getBaseUrlOption = exports.getSplitChunksOption = exports.getPlatformOption = void 0;
const jsc_safe_url_1 = require("jsc-safe-url");
const getAppendScripts_1 = __importDefault(require("metro/src/lib/getAppendScripts"));
const processModules_1 = require("./processModules");
function getPlatformOption(graph, options) {
    if (graph.transformOptions?.platform != null) {
        return graph.transformOptions.platform;
    }
    if (!options.sourceUrl) {
        return null;
    }
    const sourceUrl = (0, jsc_safe_url_1.isJscSafeUrl)(options.sourceUrl)
        ? (0, jsc_safe_url_1.toNormalUrl)(options.sourceUrl)
        : options.sourceUrl;
    const url = new URL(sourceUrl, 'https://expo.dev');
    return url.searchParams.get('platform') ?? null;
}
exports.getPlatformOption = getPlatformOption;
function getSplitChunksOption(graph, options) {
    // Only enable when the entire bundle is being split, and only run on web.
    return !options.includeAsyncPaths && getPlatformOption(graph, options) === 'web';
}
exports.getSplitChunksOption = getSplitChunksOption;
function getBaseUrlOption(graph, options) {
    const baseUrl = graph.transformOptions?.customTransformOptions?.baseUrl;
    if (typeof baseUrl === 'string') {
        // This tells us that the value came over a URL and may be encoded.
        const mayBeEncoded = options.serializerOptions == null;
        const option = mayBeEncoded ? decodeURIComponent(baseUrl) : baseUrl;
        return option.replace(/\/+$/, '') + '/';
    }
    return '/';
}
exports.getBaseUrlOption = getBaseUrlOption;
function baseJSBundle(entryPoint, preModules, graph, options) {
    const platform = getPlatformOption(graph, options);
    if (platform == null) {
        throw new Error('platform could not be determined for Metro bundle');
    }
    return baseJSBundleWithDependencies(entryPoint, preModules, [...graph.dependencies.values()], {
        ...options,
        baseUrl: getBaseUrlOption(graph, options),
        splitChunks: getSplitChunksOption(graph, options),
        platform,
        skipWrapping: !!options.serializerOptions?.skipWrapping,
        computedAsyncModulePaths: null,
    });
}
exports.baseJSBundle = baseJSBundle;
function baseJSBundleWithDependencies(entryPoint, preModules, dependencies, options) {
    for (const module of dependencies) {
        options.createModuleId(module.path);
    }
    const processModulesOptions = {
        filter: options.processModuleFilter,
        createModuleId: options.createModuleId,
        dev: options.dev,
        includeAsyncPaths: options.includeAsyncPaths,
        projectRoot: options.projectRoot,
        serverRoot: options.serverRoot,
        sourceUrl: options.sourceUrl,
        platform: options.platform,
        baseUrl: options.baseUrl,
        splitChunks: options.splitChunks,
        skipWrapping: options.skipWrapping,
        computedAsyncModulePaths: options.computedAsyncModulePaths,
    };
    // Do not prepend polyfills or the require runtime when only modules are requested
    if (options.modulesOnly) {
        preModules = [];
    }
    const preCode = (0, processModules_1.processModules)(preModules, processModulesOptions)
        .map(([, code]) => code.src)
        .join('\n');
    const modules = [...dependencies].sort((a, b) => options.createModuleId(a.path) - options.createModuleId(b.path));
    const postCode = (0, processModules_1.processModules)((0, getAppendScripts_1.default)(entryPoint, [...preModules, ...modules], {
        asyncRequireModulePath: options.asyncRequireModulePath,
        createModuleId: options.createModuleId,
        getRunModuleStatement: options.getRunModuleStatement,
        inlineSourceMap: options.inlineSourceMap,
        runBeforeMainModule: options.runBeforeMainModule,
        runModule: options.runModule,
        shouldAddToIgnoreList: options.shouldAddToIgnoreList,
        sourceMapUrl: options.serializerOptions?.includeSourceMaps === false ? undefined : options.sourceMapUrl,
        // This directive doesn't make a lot of sense in the context of a large single bundle that represent
        // multiple files. It's usually used for things like TypeScript where you want the file name to appear with a
        // different extension. Since it's unclear to me (Bacon) how it is used on native, I'm only disabling in web.
        sourceUrl: options.platform === 'web' ? undefined : options.sourceUrl,
    }), processModulesOptions)
        .map(([, code]) => code.src)
        .join('\n');
    const mods = (0, processModules_1.processModules)([...dependencies], processModulesOptions).map(([module, code]) => [
        options.createModuleId(module.path),
        code,
    ]);
    return {
        pre: preCode,
        post: postCode,
        modules: mods.map(([id, code]) => [
            id,
            typeof code === 'number' ? code : code.src,
        ]),
    };
}
exports.baseJSBundleWithDependencies = baseJSBundleWithDependencies;
