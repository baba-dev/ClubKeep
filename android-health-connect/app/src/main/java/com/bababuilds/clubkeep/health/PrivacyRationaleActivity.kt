package com.bababuilds.clubkeep.health

import android.os.Bundle
import android.widget.TextView
import androidx.activity.ComponentActivity

/** Shown from Health Connect's official permission rationale path. */
class PrivacyRationaleActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(TextView(this).apply {
            text = getString(R.string.privacy_description)
            textSize = 18f
            setPadding(42, 64, 42, 48)
            contentDescription = text
        })
    }
}
