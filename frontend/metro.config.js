const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const stubPath = path.resolve(__dirname, 'src/shims/usePanResponder.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === './usePanResponder') {
    return { filePath: stubPath, type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
