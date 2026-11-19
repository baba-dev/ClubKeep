package com.bababuilds.clubkeep.health

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** No cookies, redirects, third-party telemetry or raw health-data logs. */
class ClubKeepApi(private val origin: String) {
    init { require(origin.startsWith("https://") && !origin.contains("invalid.clubkeep.example")) }
    suspend fun post(path: String, body: JSONObject, token: String? = null): JSONObject =
        withContext(Dispatchers.IO) {
            require(path.startsWith("/api/native/health-connect/"))
            val c = URL(origin.trimEnd('/') + path).openConnection() as HttpURLConnection
            try {
                c.requestMethod = "POST"
                c.connectTimeout = 12000
                c.readTimeout = 25000
                c.doOutput = true
                c.instanceFollowRedirects = false
                c.setRequestProperty("Content-Type", "application/json")
                c.setRequestProperty("Accept", "application/json")
                if (token != null) c.setRequestProperty("Authorization", "Bearer $token")
                val raw = body.toString().toByteArray(Charsets.UTF_8)
                require(raw.size <= 65536) { "Sync request too large" }
                c.outputStream.use { it.write(raw) }
                if (c.responseCode !in 200..299) {
                    throw IllegalStateException("ClubKeep rejected the request (HTTP " + c.responseCode + ").")
                }
                JSONObject(c.inputStream.bufferedReader().use { it.readText() })
            } finally { c.disconnect() }
        }
}
