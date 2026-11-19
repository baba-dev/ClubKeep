package com.bababuilds.clubkeep.health

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Keystore AES-GCM protects bearer tokens and Health Connect cursors at rest. */
class CredentialVault(context: Context) {
    private val prefs = context.getSharedPreferences("ck_hc_private", Context.MODE_PRIVATE)
    private val alias = "clubkeep-health-connect-v1"
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build())
        }.generateKey()
    }
    fun put(name: String, value: String) {
        val c = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
        val iv = Base64.encodeToString(c.iv, Base64.NO_WRAP)
        val encrypted = Base64.encodeToString(c.doFinal(value.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
        prefs.edit().putString(name, "$iv:$encrypted").apply()
    }
    fun get(name: String): String? {
        val blob = prefs.getString(name, null) ?: return null
        return try {
            val parts = blob.split(":", limit = 2)
            if (parts.size != 2) return null
            val c = Cipher.getInstance("AES/GCM/NoPadding").apply {
                init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)))
            }
            String(c.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), Charsets.UTF_8)
        } catch (_: Exception) { null } // corrupted keys require re-pair, never fail open
    }
    fun remove(name: String) { prefs.edit().remove(name).apply() }
    fun clear() { prefs.edit().clear().apply() }
}
