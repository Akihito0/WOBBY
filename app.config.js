import 'dotenv/config';

export default {
  expo: {
    name: "Wobby",
    slug: "Wobby",
    version: "1.0.0",
    scheme: "wobby",
    orientation: "portrait",
    icon: "./src/assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./src/assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.tweetie.wobby",
      entitlements: {
        "com.apple.developer.healthkit": true,
        "com.apple.developer.healthkit.access": []
      },
      // 🔧 CHANGE: Merged your two separate `infoPlist` objects into one.
      // In JS, duplicate keys cause the second to silently overwrite the first,
      // which was dropping `ITSAppUsesNonExemptEncryption: false`.
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSHealthShareUsageDescription: "Wobby needs to read your Apple Watch data to sync your workout history.",
        NSHealthUpdateUsageDescription: "Wobby needs to save your computer vision workouts to Apple Health."
      }
    },
    android: {
      package: "com.ness.wobby",
      targetSdkVersion: 35,
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./src/assets/android-icon-foreground.png"
      },
      predictiveBackGestureEnabled: false
    },
    web: {
      favicon: "./src/assets/favicon.png"
    },
    plugins: [
      "expo-font",
      "expo-web-browser",
      "react-native-vision-camera",
      "@react-native-community/datetimepicker",
      "expo-image-picker",
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsDownloadToken: process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "6dd78270-0e8a-408f-83a3-a5a0c21d009c"
      }
    }
  }
};