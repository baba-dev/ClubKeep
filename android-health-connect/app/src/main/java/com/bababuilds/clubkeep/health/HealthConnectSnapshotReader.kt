package com.bababuilds.clubkeep.health

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.aggregate.AggregateRequest
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HydrationRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.roundToInt

/** Streams bounded pages rather than buffering an entire wearable history. */
class HealthConnectSnapshotReader(private val client: HealthConnectClient) {
    private fun record(kind: String, id: String, source: String, start: Instant,
                       end: Instant, value: Int? = null, exerciseType: Int? = null): JSONObject =
        JSONObject().put("recordType", kind).put("externalId", id)
            .put("sourcePackage", source).put("startedAt", start.toString())
            .put("endedAt", end.toString())
            .apply {
                if (value != null) put("value", value)
                if (exerciseType != null) put("exerciseType", exerciseType)
            }

    suspend fun snapshot(grants: Set<String>, from: Instant, until: Instant,
                         emit: suspend (List<JSONObject>) -> Unit) {
        val filter = TimeRangeFilter.between(from, until)

        // The HC aggregate API resolves duplicated step sources; raw step samples don't.
        if ("STEPS_DAILY" in grants) {
            val zone = ZoneId.systemDefault()
            var day = LocalDate.ofInstant(from, zone)
            val latest = LocalDate.ofInstant(until, zone)
            while (!day.isAfter(latest)) {
                val start = day.atStartOfDay(zone).toInstant()
                val end = day.plusDays(1).atStartOfDay(zone).toInstant()
                if (start < until && end > from) {
                    val total = client.aggregate(AggregateRequest(
                        metrics = setOf(StepsRecord.COUNT_TOTAL),
                        timeRangeFilter = TimeRangeFilter.between(start, minOf(end, until))
                    ))[StepsRecord.COUNT_TOTAL]
                    if (total != null && total in 0L..5000000L) {
                        emit(listOf(record("STEPS_DAILY", day.toString(), "health-connect-aggregate",
                            start, minOf(end, until), total.toInt())))
                    }
                }
                day = day.plusDays(1)
            }
        }
        if ("WORKOUT" in grants) {
            var token: String? = null
            do {
                val page = client.readRecords(ReadRecordsRequest(
                    ExerciseSessionRecord::class, timeRangeFilter = filter,
                    pageSize = 100, pageToken = token))
                emit(page.records.map { r -> record("WORKOUT", r.metadata.id,
                    r.metadata.dataOrigin.packageName, r.startTime, r.endTime,
                    exerciseType = r.exerciseType) })
                token = page.pageToken
            } while (token != null)
        }
        if ("SLEEP" in grants) {
            var token: String? = null
            do {
                val page = client.readRecords(ReadRecordsRequest(
                    SleepSessionRecord::class, timeRangeFilter = filter,
                    pageSize = 100, pageToken = token))
                emit(page.records.map { r -> record("SLEEP", r.metadata.id,
                    r.metadata.dataOrigin.packageName, r.startTime, r.endTime) })
                token = page.pageToken
            } while (token != null)
        }
        if ("HYDRATION" in grants) {
            var token: String? = null
            do {
                val page = client.readRecords(ReadRecordsRequest(
                    HydrationRecord::class, timeRangeFilter = filter,
                    pageSize = 100, pageToken = token))
                emit(page.records.mapNotNull { r ->
                    val ml = r.volume.inMilliliters.roundToInt()
                    if (ml in 1..5000) record("HYDRATION", r.metadata.id,
                        r.metadata.dataOrigin.packageName, r.startTime, r.endTime, ml) else null
                })
                token = page.pageToken
            } while (token != null)
        }
        if ("ACTIVE_CALORIES" in grants) {
            var token: String? = null
            do {
                val page = client.readRecords(ReadRecordsRequest(
                    ActiveCaloriesBurnedRecord::class, timeRangeFilter = filter,
                    pageSize = 100, pageToken = token))
                emit(page.records.mapNotNull { r ->
                    val kcal = r.energy.inKilocalories.roundToInt()
                    if (kcal in 0..5000000) record("ACTIVE_CALORIES", r.metadata.id,
                        r.metadata.dataOrigin.packageName, r.startTime, r.endTime, kcal) else null
                })
                token = page.pageToken
            } while (token != null)
        }
    }
}
