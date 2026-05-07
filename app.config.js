module.exports = {
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
      bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_ID || "com.tweetie.wobby",
      entitlements: {
        "com.apple.developer.healthkit": true
      },
      infoPlist: { 
        ITSAppUsesNonExemptEncryption: false,
        NSHealthShareUsageDescription: "Wobby needs to read your Apple Watch data to sync your workout history.",
        NSHealthUpdateUsageDescription: "Wobby needs to save your computer vision workouts to Apple Health.",
        NSBluetoothAlwaysAndWhenInUseUsageDescription: "Wobby needs Bluetooth to connect to your fitness devices and wearables.",
        NSBluetoothPeripheralUsageDescription: "Wobby needs Bluetooth to connect to your fitness devices and wearables."
      }
    },
    android: {
      package: "com.tweetie.wobby",
      // Removed minSdkVersion and targetSdkVersion from here!
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./src/assets/android-icon-foreground.png"
      },
      predictiveBackGestureEnabled: false,
      permissions: [
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION"
      ]
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
      "react-native-ble-plx",
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsDownloadToken: process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN
        }
      ],
      // Add the build properties plugin down here instead!
      [
        "expo-build-properties",
        {
          android: {
            minSdkVersion: 26,
            targetSdkVersion: 35
          }
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