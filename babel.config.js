module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
          },
        },
      ],
      // react-native-worklets/plugin replaces react-native-reanimated/plugin
      // in Reanimated 4 (Expo SDK 54). Must be listed last.
      'react-native-worklets/plugin',
    ],
  };
};
