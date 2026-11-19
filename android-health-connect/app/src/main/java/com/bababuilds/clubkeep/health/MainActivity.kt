package com.bababuilds.clubkeep.health

import android.os.Bundle
import androidx.activity.ComponentActivity
import com.bababuilds.clubkeep.health.databinding.ActivityMainBinding

/** Native companion, not a replacement for ClubKeep Personal's web interface. */
class MainActivity : ComponentActivity() {
    private lateinit var views: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        views = ActivityMainBinding.inflate(layoutInflater)
        setContentView(views.root)
        val configured = !BuildConfig.SERVER_BASE_URL.contains("invalid.clubkeep.example")
        views.status.text = if (configured) {
            "Connect an adult ClubKeep Personal account to choose your permissions."
        } else {
            "This build has no trusted ClubKeep origin. Configure the server before pairing."
        }
        listOf(views.connect, views.permissions, views.sync, views.disconnect).forEach {
            it.isEnabled = false // Enabled by explicit pairing and permission workflow in P1-C.
        }
        views.privacy.setOnClickListener {
            startActivity(android.content.Intent(this, PrivacyRationaleActivity::class.java))
        }
    }
}
