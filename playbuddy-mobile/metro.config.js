const path = require("path");
const { resolve } = require("metro-resolver");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

config.transformer = {
  ...config.transformer,
  hermesParser: true,
};

const defaultResolveRequest = config.resolver?.resolveRequest;
const wsShim = path.resolve(__dirname, "shims/ws.js");
const nodeFetchShim = path.resolve(__dirname, "shims/node-fetch.js");
const amplitudeShim = path.resolve(
  __dirname,
  "node_modules/@amplitude/analytics-react-native/lib/commonjs/index.js",
);

config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules || {}),
    ws: wsShim,
    "@supabase/node-fetch": nodeFetchShim,
    "@amplitude/analytics-react-native": path.dirname(amplitudeShim),
  },
  resolveRequest: (context, moduleName, platform) => {
    if (moduleName === "ws") {
      return { type: "sourceFile", filePath: wsShim };
    }
    if (moduleName === "@supabase/node-fetch") {
      return { type: "sourceFile", filePath: nodeFetchShim };
    }
    if (moduleName === "@amplitude/analytics-react-native") {
      return { type: "sourceFile", filePath: amplitudeShim };
    }
    if (defaultResolveRequest) {
      return defaultResolveRequest(context, moduleName, platform);
    }
    return resolve(context, moduleName, platform);
  },
};

module.exports = config;
