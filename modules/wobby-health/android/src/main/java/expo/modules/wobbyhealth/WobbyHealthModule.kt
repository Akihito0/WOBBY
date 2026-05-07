package expo.modules.wobbyhealth

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import android.util.Log

class WobbyHealthModule : Module() {
  
  override fun definition() = ModuleDefinition {
    Name("WobbyHealth")

    AsyncFunction("requestPermissions") { promise: Promise ->
      val context = appContext.reactContext

      if (context == null) {
        Log.e("WobbyHealth", "React Context is null")
        promise.resolve(false)
        return@AsyncFunction
      }

      // 1. Check if Health Connect is installed and available on the phone
      val availabilityStatus = HealthConnectClient.getSdkStatus(context)
      if (availabilityStatus == HealthConnectClient.SDK_UNAVAILABLE) {
        Log.e("WobbyHealth", "Health Connect is not available on this device")
        promise.resolve(false)
        return@AsyncFunction
      }

      // 2. Initialize the client
      val healthConnectClient = HealthConnectClient.getOrCreate(context)
      Log.d("WobbyHealth", "Health Connect Client initialized successfully!")

      // Note: Launching the actual Android permission dialog requires an Activity Result Contract.
      // For this step, we are resolving true to confirm the client connects.
      promise.resolve(true)
    }

    AsyncFunction("getLatestHeartRate") { promise: Promise ->
      // TODO: Implement Health Connect Read Logic
      Log.d("WobbyHealth", "getLatestHeartRate called")
      promise.resolve(null)
    }

    AsyncFunction("getHeartRateHistory") { daysBack: Int, promise: Promise ->
      // TODO: Implement Health Connect History Read Logic
      Log.d("WobbyHealth", "getHeartRateHistory called for $daysBack days")
      promise.resolve(emptyList<Map<String, Any>>())
    }
  }
}