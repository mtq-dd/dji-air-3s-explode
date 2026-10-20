plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.example.air3s"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.air3s"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // 若 CI 注入了 keystore，就用它签名；否则 release 包不签名（仅归档）
            val storePath = System.getenv("SIGNING_STORE_FILE")
            if (storePath != null && java.io.File(storePath).exists()) {
                signingConfig = signingConfigs.create("ci") {
                    storeFile = java.io.File(storePath)
                    storePassword = System.getenv("SIGNING_STORE_PASSWORD")
                    keyAlias = System.getenv("SIGNING_KEY_ALIAS")
                    keyPassword = System.getenv("SIGNING_KEY_PASSWORD")
                }
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = false
    }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

/**
 * 页面只有一份源文件（仓库根目录的 index.html），
 * 构建时复制进 assets，避免 600KB 的产物在仓库里存两份、改一处漏一处。
 */
val syncWebPage = tasks.register<Copy>("syncWebPage") {
    from(rootProject.layout.projectDirectory.file("../index.html"))
    into(layout.projectDirectory.dir("src/main/assets"))
    rename { "dji-air-3s.html" }
}

tasks.matching { it.name == "preBuild" }.configureEach {
    dependsOn(syncWebPage)
}

tasks.matching { it.name.startsWith("merge") && it.name.endsWith("Assets") }.configureEach {
    dependsOn(syncWebPage)
}

dependencies {
    // 不引入 AndroidX：宿主只是一个 WebView，零依赖构建更快、更少踩版本坑
}
