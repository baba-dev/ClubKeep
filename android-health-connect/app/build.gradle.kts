plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val clubkeepBaseUrl = providers.gradleProperty("clubkeepBaseUrl").orElse("https://invalid.clubkeep.example").get()
require(clubkeepBaseUrl.startsWith("https://") && !clubkeepBaseUrl.contains('"')) {
    "Only a trusted HTTPS ClubKeep origin may be configured"
}
android {
    namespace = "com.bababuilds.clubkeep.health"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.bababuilds.clubkeep.health"
        minSdk = 28
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        buildConfigField("String", "SERVER_BASE_URL", "\"$clubkeepBaseUrl\"")
    }
    buildFeatures { buildConfig = true; viewBinding = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
        debug { isMinifyEnabled = false }
    }
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.13.0")
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.health.connect:connect-client:1.1.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("com.google.android.material:material:1.13.0")
    testImplementation("junit:junit:4.13.2")
}
