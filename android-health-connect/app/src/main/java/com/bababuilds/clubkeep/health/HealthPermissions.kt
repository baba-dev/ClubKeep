package com.bababuilds.clubkeep.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HydrationRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord

/** Only fitness categories; no heart rate, glucose, medications, clinical records or write rights. */
object HealthPermissions {
    val steps = HealthPermission.getReadPermission(StepsRecord::class)
    val workouts = HealthPermission.getReadPermission(ExerciseSessionRecord::class)
    val sleep = HealthPermission.getReadPermission(SleepSessionRecord::class)
    val calories = HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class)
    val hydration = HealthPermission.getReadPermission(HydrationRecord::class)

    val default = setOf(steps, workouts, sleep, calories)
    fun requested(includeHydration: Boolean): Set<String> =
        if (includeHydration) default + hydration else default

    fun available(context: Context): Boolean =
        HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE

    fun client(context: Context): HealthConnectClient {
        check(available(context)) { "Health Connect is not installed or supported." }
        return HealthConnectClient.getOrCreate(context)
    }
    fun grantedCategories(permissions: Set<String>): Set<String> = buildSet {
        if (steps in permissions) add("STEPS_DAILY")
        if (workouts in permissions) add("WORKOUT")
        if (sleep in permissions) add("SLEEP")
        if (calories in permissions) add("ACTIVE_CALORIES")
        if (hydration in permissions) add("HYDRATION")
    }
}
