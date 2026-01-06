const { withAppBuildGradle } = require('@expo/config-plugins');

const MAX_PAGE_SIZE_FLAG = '-Wl,-z,max-page-size=16384';

function withAndroid16kPageSize(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }

    if (config.modResults.contents.includes('max-page-size=16384')) {
      return config;
    }

    const snippet = [
      'if (project.hasProperty("newArchEnabled") && project.property("newArchEnabled") == "true") {',
      '    android {',
      '        defaultConfig {',
      '            externalNativeBuild {',
      '                cmake {',
      `                    arguments "-DCMAKE_SHARED_LINKER_FLAGS=${MAX_PAGE_SIZE_FLAG}",`,
      `                              "-DCMAKE_EXE_LINKER_FLAGS=${MAX_PAGE_SIZE_FLAG}",`,
      `                              "-DCMAKE_MODULE_LINKER_FLAGS=${MAX_PAGE_SIZE_FLAG}"`,
      '                }',
      '            }',
      '        }',
      '    }',
      '}',
    ].join('\n');

    config.modResults.contents = `${config.modResults.contents.trimEnd()}\n\n${snippet}\n`;
    return config;
  });
}

module.exports = withAndroid16kPageSize;
