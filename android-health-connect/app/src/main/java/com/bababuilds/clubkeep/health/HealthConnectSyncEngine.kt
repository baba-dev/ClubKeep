package com.bababuilds.clubkeep.health

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.changes.DeletionChange
import androidx.health.connect.client.changes.UpsertionChange
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HydrationRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.request.ChangesTokenRequest
import kotlinx.coroutines.delay
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

data class SyncReport(val imported: Int, val deleted: Int, val mode: String)

/**
 * Foreground user-initiated sync only. No background Health Connect permission.
 * The encrypted cursor is committed only AFTER all corresponding server batches
 * acknowledge success. Missing/revoked categories are never read.
 */
class HealthConnectSyncEngine(
    private val client: HealthConnectClient,
    private val api: ClubKeepApi,
    private val vault: CredentialVault
) {
    private val reader = HealthConnectSnapshotReader(client)
    private val batchSize = 60

    private fun subscribedTypes(granted: Set<String>) = buildSet {
        if ("WORKOUT" in granted) add(ExerciseSessionRecord::class)
        if ("SLEEP" in granted) add(SleepSessionRecord::class)
        if ("HYDRATION" in granted) add(HydrationRecord::class)
        if ("ACTIVE_CALORIES" in granted) add(ActiveCaloriesBurnedRecord::class)
    }

    private fun indexKey(record: JSONObject) = record.getString("externalId")
    private fun indexValue(record: JSONObject) =
        record.getString("recordType") + "|" + record.getString("sourcePackage")
    private fun saveIndex(index: JSONObject) { vault.put("sourceIndex", index.toString()) }
    private fun openIndex(): JSONObject = try {
        JSONObject(vault.get("sourceIndex") ?: "{}")
    } catch (_: Exception) { JSONObject() }

    private suspend fun transmit(
        token: String, grants: Set<String>, index: JSONObject,
        items: List<JSONObject>, deletions: List<JSONObject>
    ): Pair<Int, Int> {
        var imported = 0
        var deleted = 0
        val scope = JSONArray(grants.sorted())
        val upChunks = items.chunked(batchSize)
        val delChunks = deletions.chunked(batchSize)
        val batches = maxOf(upChunks.size, delChunks.size, 1)
        for (i in 0 until batches) {
            val up = if (i < upChunks.size) upChunks[i] else emptyList()
            val gone = if (i < delChunks.size) delChunks[i] else emptyList()
            val body = JSONObject()
                .put("requestId", UUID.randomUUID().toString())
                .put("grantedTypes", scope)
                .put("records", JSONArray(up))
                .put("deletions", JSONArray(gone))
            // The native code never logs request bodies, bearer tokens or source IDs.
            var failure: Exception? = null
            var accepted = false
            for (attempt in 0..2) {
                try {
                    api.post("/api/native/health-connect/batches", body, token)
                    accepted = true
                    break
                } catch (e: Exception) {
                    failure = e
                    if (attempt < 2) delay(500L * (attempt + 1))
                }
            }
            if (!accepted) throw failure ?: IllegalStateException("Sync rejected")
            for (record in up) index.put(indexKey(record), indexValue(record))
            for (record in gone) index.remove(record.getString("externalId"))
            saveIndex(index)
            imported += up.size
            deleted += gone.size
        }
        return imported to deleted
    }

    suspend fun sync(token: String): SyncReport {
        val actual = client.permissionController.getGrantedPermissions()
        val grants = HealthPermissions.grantedCategories(actual)
        val scope = grants.sorted().joinToString("|")
        val previous = vault.get("changesToken")
        val index = openIndex()
        if (grants.isEmpty()) {
            transmit(token, grants, index, emptyList(), emptyList())
            vault.remove("changesToken")
            vault.remove("changesScope")
            return SyncReport(0, 0, "no permission")
        }
        val changedTypes = subscribedTypes(grants)
        val scopeChanged = vault.get("changesScope") != scope
        if (previous == null || scopeChanged || changedTypes.isEmpty()) {
            // Take a cursor BEFORE the snapshot to avoid missing changes during
            // its pagination. Replaying later is safe because backend upserts.
            val initial = if (changedTypes.isEmpty()) null else
                client.getChangesToken(ChangesTokenRequest(changedTypes))
            var count = 0
            val from = Instant.now().minus(29, ChronoUnit.DAYS)
            reader.snapshot(grants, from, Instant.now()) { rows ->
                if (rows.isNotEmpty()) {
                    val result = transmit(token, grants, index, rows, emptyList())
                    count += result.first
                }
            }
            // Even an empty snapshot reports the currently granted categories.
            if (count == 0) transmit(token, grants, index, emptyList(), emptyList())
            if (initial != null) vault.put("changesToken", initial)
            else vault.remove("changesToken")
            vault.put("changesScope", scope)
            vault.put("lastSyncedAt", Instant.now().toString())
            return SyncReport(count, 0, "initial snapshot")
        }

        var cursor = previous
        var count = 0
        var removed = 0
        do {
            val response = client.getChanges(cursor)
            if (response.changesTokenExpired) {
                // Expired credentials cannot be used for incremental deletions.
                // Re-snapshot conservatively and inform user in the review UI.
                vault.remove("changesToken")
                return sync(token)
            }
            val upserts = mutableListOf<JSONObject>()
            val deletions = mutableListOf<JSONObject>()
            for (change in response.changes) {
                when (change) {
                    is UpsertionChange -> {
                        val item = reader.changed(change.record) ?: continue
                        if (item.getString("recordType") in grants) upserts.add(item)
                    }
                    is DeletionChange -> {
                        val tracked = index.optString(change.recordId, "")
                        val parts = tracked.split("|", limit = 2)
                        if (parts.size == 2) {
                            deletions.add(JSONObject().put("recordType", parts[0])
                                .put("sourcePackage", parts[1])
                                .put("externalId", change.recordId))
                        }
                    }
                }
            }
            val result = transmit(token, grants, index, upserts, deletions)
            count += result.first
            removed += result.second
            // This token advances only after ALL batches in this changes page commit.
            cursor = response.nextChangesToken
            vault.put("changesToken", cursor)
        } while (response.hasMore)

        // Daily aggregate repair captures changed steps without raw duplicates.
        if ("STEPS_DAILY" in grants) {
            reader.snapshot(setOf("STEPS_DAILY"), Instant.now().minus(29, ChronoUnit.DAYS),
                Instant.now()) { rows ->
                if (rows.isNotEmpty()) {
                    val result = transmit(token, grants, index, rows, emptyList())
                    count += result.first
                }
            }
        }
        vault.put("changesScope", scope)
        vault.put("lastSyncedAt", Instant.now().toString())
        return SyncReport(count, removed, "incremental")
    }
}
