package com.bababuilds.clubkeep.health

import android.content.Intent
import android.os.Bundle
import android.os.Build
import androidx.activity.ComponentActivity
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.lifecycleScope
import com.bababuilds.clubkeep.health.databinding.ActivityMainBinding
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.UUID

/**
 * Native companion with deliberate user-facing controls. Health Connect never
 * runs on page load, never sends a grant implicitly, and has no background sync.
 */
class MainActivity : ComponentActivity() {
    private lateinit var views: ActivityMainBinding
    private lateinit var vault: CredentialVault
    private var working = false
    private val permissionRequest = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        showStatus(if (granted.isEmpty()) "No fitness permissions granted." else
            "Permissions reviewed. Use Sync only when you want to upload.")
        updateControls()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        views = ActivityMainBinding.inflate(layoutInflater)
        setContentView(views.root)
        vault = CredentialVault(applicationContext)
        views.connect.setOnClickListener { connect() }
        views.permissions.setOnClickListener { requestPermissions() }
        views.sync.setOnClickListener { syncNow() }
        views.disconnect.setOnClickListener { disconnect() }
        views.privacy.setOnClickListener {
            startActivity(Intent(this, PrivacyRationaleActivity::class.java))
        }
        updateControls()
        showStatus(when {
            !configured() -> "This build has no reviewed ClubKeep HTTPS origin."
            vault.get("token") != null -> "Paired. Permissions are checked again before every sync."
            else -> "Open Personal Connections in the browser and copy a one-time pairing code."
        })
    }

    private fun configured() = BuildConfig.SERVER_BASE_URL.startsWith("https://") &&
        !BuildConfig.SERVER_BASE_URL.contains("invalid.clubkeep.example")

    private fun updateControls() {
        val linked = configured() && vault.get("token") != null
        views.connect.isEnabled = !working && configured()
        views.permissions.isEnabled = !working && linked && HealthPermissions.available(this)
        views.sync.isEnabled = !working && linked && HealthPermissions.available(this)
        views.disconnect.isEnabled = !working && linked
    }
    private fun showStatus(value: String) { views.status.text = value }
    private fun connect() {
        if (working || !configured()) return
        val code = views.pairCode.text?.toString()?.trim() ?: ""
        if (!Regex("^[A-Za-z0-9_-]{43}$").matches(code)) {
            showStatus("Paste the entire short-lived pairing code."); return
        }
        working = true; updateControls()
        lifecycleScope.launch {
            try {
                val installId = vault.get("installationId") ?: UUID.randomUUID().toString()
                val payload = JSONObject()
                    .put("pairCode", code).put("installationId", installId)
                    .put("label", "Android " + Build.MODEL.take(50))
                val response = ClubKeepApi(BuildConfig.SERVER_BASE_URL)
                    .post("/api/native/health-connect/claim", payload)
                vault.put("installationId", installId)
                vault.put("token", response.getString("token"))
                vault.put("connectionId", response.getString("connectionId"))
                vault.remove("changesToken")
                vault.remove("sourceIndex")
                vault.remove("changesScope")
                views.pairCode.text?.clear()
                showStatus("Account paired. Choose the permissions you want to grant.")
            } catch (_: Exception) {
                showStatus("Pairing failed. Confirm the code, server and connection, then retry.")
            } finally { working = false; updateControls() }
        }
    }

    private fun requestPermissions() {
        if (vault.get("token") == null || !HealthPermissions.available(this)) return
        permissionRequest.launch(HealthPermissions.requested(views.includeHydration.isChecked))
    }

    private fun disconnect() {
        val token = vault.get("token") ?: return
        if (working) return
        working = true; updateControls()
        lifecycleScope.launch {
            try {
                ClubKeepApi(BuildConfig.SERVER_BASE_URL)
                    .post("/api/native/health-connect/disconnect", JSONObject(), token)
                vault.clear()
                views.pairCode.text?.clear()
                showStatus("Disconnected on ClubKeep. Imported history can be erased in Personal.")
            } catch (_: Exception) {
                showStatus("Cannot confirm remote disconnect. Use Personal Connections to revoke.")
            } finally { working = false; updateControls() }
        }
    }
    private fun syncNow() {
        val token = vault.get("token") ?: return
        if (working || !HealthPermissions.available(this)) return
        working = true; updateControls()
        showStatus("Reading authorized fitness data. Do not close this screen until sync completes.")
        lifecycleScope.launch {
            try {
                val result = HealthConnectSyncEngine(
                    HealthPermissions.client(this@MainActivity),
                    ClubKeepApi(BuildConfig.SERVER_BASE_URL), vault
                ).sync(token)
                showStatus("Sync complete (" + result.mode + "): " +
                    result.imported + " records updated, " + result.deleted + " removed.")
            } catch (_: Exception) {
                showStatus("Sync incomplete. Your acknowledged history is safe. Retry with the app open.")
            } finally { working = false; updateControls() }
        }
    }

}
