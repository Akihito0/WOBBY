import ExpoModulesCore
import HealthKit

public class WobbyHealthModule: Module {
  let healthStore = HKHealthStore()
  private var heartRateObserverQuery: HKObserverQuery?
  private var anchoredQuery: HKAnchoredObjectQuery?
  private var anchor: HKQueryAnchor?

  public func definition() -> ModuleDefinition {
    Name("WobbyHealth")

    Events("onHeartRateUpdate")

    // ─── 1. ASK FOR PERMISSIONS ─────────────────────────────────────────
    AsyncFunction("requestPermissions") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.reject("UNAVAILABLE", "Health data is not available on this device.")
        return
      }

      guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) else {
        promise.reject("TYPE_ERROR", "Heart rate type is no longer available in HealthKit.")
        return
      }

      let readTypes: Set<HKObjectType> = [heartRateType]

      self.healthStore.requestAuthorization(toShare: nil, read: readTypes) { (success, error) in
        if let error = error {
          promise.reject("AUTH_ERROR", error.localizedDescription)
        } else {
          promise.resolve(success)
        }
      }
    }

    // ─── 2. GET LATEST HEART RATE (For the Dashboard) ───────────────────
    AsyncFunction("getLatestHeartRate") { (promise: Promise) in
      guard let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate) else {
        promise.reject("TYPE_ERROR", "Heart rate type is not available.")
        return
      }

      // Sort by newest first
      let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
      
      let endDate = Date()
      let startDate = Calendar.current.date(byAdding: .day, value: -1, to: endDate)
      let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictEndDate)

      // Limit is 1 to just grab the most recent reading
      let query = HKSampleQuery(sampleType: heartRateType, predicate: predicate, limit: 1, sortDescriptors: [sortDescriptor]) { (query, results, error) in
        
        if let error = error {
          promise.reject("QUERY_ERROR", error.localizedDescription)
          return
        }

        guard let samples = results as? [HKQuantitySample], let latestSample = samples.first else {
          promise.resolve(nil) 
          return
        }

        let bpmUnit = HKUnit(from: "count/min")
        let bpmValue = latestSample.quantity.doubleValue(for: bpmUnit)
        
        promise.resolve(bpmValue)
      }

      self.healthStore.execute(query)
    }

    // ─── 3. GET HEART RATE HISTORY (For Charts/Graphs) ──────────────────
    AsyncFunction("getHeartRateHistory") { (daysBack: Int, promise: Promise) in
      guard let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate) else {
        promise.reject("TYPE_ERROR", "Heart rate type is not available.")
        return
      }

      let endDate = Date()
      let startDate = Calendar.current.date(byAdding: .day, value: -daysBack, to: endDate)
      let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
      
      // Sort chronologically (oldest to newest) for charting
      let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

      // Limit is NoLimit to get all samples in the timeframe
      let query = HKSampleQuery(sampleType: heartRateType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sortDescriptor]) { (query, results, error) in
        
        if let error = error {
          promise.reject("QUERY_ERROR", error.localizedDescription)
          return
        }

        guard let samples = results as? [HKQuantitySample] else {
          promise.resolve([]) 
          return
        }

        let bpmUnit = HKUnit(from: "count/min")
        let formatter = ISO8601DateFormatter()
        
        // Map native Apple data into a neat Javascript array of objects
        let historyData = samples.map { sample -> [String: Any] in
          return [
            "value": sample.quantity.doubleValue(for: bpmUnit),
            "date": formatter.string(from: sample.endDate)
          ]
        }

        promise.resolve(historyData)
      }

      self.healthStore.execute(query)
    }

    // ─── 4. START LIVE HEART RATE OBSERVER ──────────────────────────────
    // Uses HKAnchoredObjectQuery so new samples from Apple Watch fire immediately
    AsyncFunction("startHeartRateObserver") { (promise: Promise) in
      guard let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate) else {
        promise.reject("TYPE_ERROR", "Heart rate type is not available.")
        return
      }

      // Stop any existing queries
      if let existing = self.heartRateObserverQuery {
        self.healthStore.stop(existing)
        self.heartRateObserverQuery = nil
      }
      if let existing = self.anchoredQuery {
        self.healthStore.stop(existing)
        self.anchoredQuery = nil
      }

      let bpmUnit = HKUnit(from: "count/min")

      let updateHandler: (HKAnchoredObjectQuery, [HKSample]?, [HKDeletedObject]?, HKQueryAnchor?, Error?) -> Void = { [weak self] _, newSamples, _, newAnchor, error in
        guard let self = self else { return }
        if let error = error {
          print("[WobbyHealth] Anchored query error: \(error.localizedDescription)")
          return
        }
        self.anchor = newAnchor
        guard let samples = newSamples as? [HKQuantitySample], let latest = samples.last else { return }
        let bpm = latest.quantity.doubleValue(for: bpmUnit)
        self.sendEvent("onHeartRateUpdate", ["bpm": bpm])
      }

      let query = HKAnchoredObjectQuery(
        type: heartRateType,
        predicate: nil,
        anchor: self.anchor,
        limit: HKObjectQueryNoLimit,
        resultsHandler: updateHandler
      )
      query.updateHandler = updateHandler

      self.healthStore.execute(query)
      self.anchoredQuery = query

      self.healthStore.enableBackgroundDelivery(for: heartRateType, frequency: .immediate) { _, _ in }

      // Also emit the current latest reading immediately
      self.fetchLatestAndEmit(heartRateType: heartRateType) {}

      promise.resolve(true)
    }

    // ─── 5. STOP LIVE HEART RATE OBSERVER ───────────────────────────────
    AsyncFunction("stopHeartRateObserver") { (promise: Promise) in
      if let existing = self.heartRateObserverQuery {
        self.healthStore.stop(existing)
        self.heartRateObserverQuery = nil
      }
      if let existing = self.anchoredQuery {
        self.healthStore.stop(existing)
        self.anchoredQuery = nil
      }
      if let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate) {
        self.healthStore.disableBackgroundDelivery(for: heartRateType) { _, _ in }
      }
      promise.resolve(true)
    }
  }

  private func fetchLatestAndEmit(heartRateType: HKQuantityType, completion: @escaping () -> Void) {
    let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
    // Only look at the last 5 minutes for a "live" reading
    let fiveMinutesAgo = Date().addingTimeInterval(-5 * 60)
    let predicate = HKQuery.predicateForSamples(withStart: fiveMinutesAgo, end: Date(), options: .strictEndDate)
    let query = HKSampleQuery(sampleType: heartRateType, predicate: predicate, limit: 1, sortDescriptors: [sortDescriptor]) { [weak self] _, results, _ in
      defer { completion() }
      guard let self = self else { return }
      // Fall back to last 24h if nothing in last 5 min
      if let samples = results as? [HKQuantitySample], let latest = samples.first {
        let bpm = latest.quantity.doubleValue(for: HKUnit(from: "count/min"))
        self.sendEvent("onHeartRateUpdate", ["bpm": bpm])
      } else {
        self.fetchFallbackAndEmit(heartRateType: heartRateType)
      }
    }
    self.healthStore.execute(query)
  }

  private func fetchFallbackAndEmit(heartRateType: HKQuantityType) {
    let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
    let oneDayAgo = Calendar.current.date(byAdding: .day, value: -1, to: Date())
    let predicate = HKQuery.predicateForSamples(withStart: oneDayAgo, end: Date(), options: .strictEndDate)
    let query = HKSampleQuery(sampleType: heartRateType, predicate: predicate, limit: 1, sortDescriptors: [sortDescriptor]) { [weak self] _, results, _ in
      guard let self = self else { return }
      guard let samples = results as? [HKQuantitySample], let latest = samples.first else { return }
      let bpm = latest.quantity.doubleValue(for: HKUnit(from: "count/min"))
      self.sendEvent("onHeartRateUpdate", ["bpm": bpm])
    }
    self.healthStore.execute(query)
  }
}