package com.example.air3s

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * DJI Air 3S 结构拆解可视化 —— Android 端（Kotlin）
 *
 * 方案说明：
 * 把 index.html 整体放进 assets/（单文件、已内联 Three.js），
 * 用 WebView 加载即可 100% 复刻浏览器端效果（WebGL 由系统 Chromium 内核提供）。
 *
 * 目录要点：
 *   app/src/main/assets/dji-air-3s.html   ← 由 index.html 复制而来
 *   app/src/main/java/.../DroneExplodeActivity.kt
 *
 * 关键配置（缺一不可）：
 *   1. settings.javaScriptEnabled = true
 *   2. settings.domStorageEnabled  = true
 *   3. setLayerType / 硬件加速（manifest 里 android:hardwareAccelerated="true"）
 *   4. WebView 必须开启 WebGL（>= Android 5.0 默认可用，个别 ROM 需关闭「省电模式」）
 */
class DroneExplodeActivity : ComponentActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            // 允许 JS 与本地存储（CSS2D 标签不依赖存储，但 Three.js 部分扩展会用到）
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.allowFileAccess = true          // assets 走 file:///android_asset/
            settings.allowContentAccess = false
            // 横竖屏旋转时不重建，避免 WebGL 上下文丢失导致的卡顿
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            // 高刷屏下更顺滑
            settings.setSupportZoom(false)
            settings.builtInZoomControls = false

            // 关闭滚动条与长按选中，贴近原生 App 观感
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            isLongClickable = false
            setBackgroundColor(0xFF05070C.toInt())

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView,
                    request: WebResourceRequest
                ): Boolean = false // 单页应用，不需要拦截跳转
            }
            webChromeClient = WebChromeClient()

            // 注入原生桥接：页面 selectPart() 里会调用 window.AndroidBridge.onPartSelected(id, name)
            addJavascriptInterface(Bridge(), "AndroidBridge")

            loadUrl("file:///android_asset/dji-air-3s.html")
        }

        setContentView(webView)
        goImmersive()

        // 返回键：优先让页面先「取消选中 / 复位」，没有可取消状态时再退出
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript(
                    "window.__deselect ? window.__deselect() : false"
                ) { result ->
                    // 页面里没有选中部件时才真正退出
                    if (result?.contains("true") != true) finish()
                }
            }
        })
    }

    /** 湿滑全屏：隐藏状态栏 / 导航栏，从刘海区延伸绘制 */
    private fun goImmersive() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
        window.decorView.systemUiVisibility =
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
    }

    /** 页面 → 原生 的回调 */
    inner class Bridge {
        private val drone = DroneCommandController(this@DroneExplodeActivity)

        /**
         * 飞行指令：页面指令台点「起飞 / 降落」等会走到这里。
         * 真正的 MSDK 调用在 DroneCommandController 里，
         * 失败原因会回写页面并触发状态回滚。
         */
        @JavascriptInterface
        fun onFlightEvent(command: String, mode: String, stateJson: String) {
            drone.dispatch(command) { ok, message ->
                val safe = message.replace("\\", "\\\\").replace("'", "\\'")
                runOnUiThread {
                    webView.evaluateJavascript(
                        "window.DroneNative && window.DroneNative.onResult('$command', $ok, '$safe')",
                        null
                    )
                }
            }
        }

        @JavascriptInterface
        fun onPartSelected(id: String, name: String) {
            // 这里可以接埋点、联动原生底部弹窗、跳转电商详情页等
            runOnUiThread {
                Toast.makeText(this@DroneExplodeActivity, "选中部件：$name", Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface
        fun onReady() {
            runOnUiThread { /* 页面首帧渲染完成，可在此关闭原生启动图 */ }
        }
    }

    /** 原生 → 页面：外部触发的接口示例 */
    fun explodeAll() {
        webView.evaluateJavascript("window.__explodeAll && window.__explodeAll()", null)
    }

    fun selectPart(partId: String) {
        webView.evaluateJavascript("window.__selectPart && window.__selectPart('$partId')", null)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        webView.resumeTimers()   // requestAnimationFrame 才会继续跑
    }

    override fun onPause() {
        webView.onPause()
        webView.pauseTimers()    // 退到后台停掉渲染循环，省电
        super.onPause()
    }

    override fun onDestroy() {
        (webView.parent as? View)?.let { }
        webView.destroy()
        super.onDestroy()
    }
}

/*
 * ────────────────────────────────────────────────────────────────
 * 附：Jetpack Compose 版本（同样的思路，两行搞定宿主）
 * ────────────────────────────────────────────────────────────────
 *
 * @Composable
 * fun DroneExplodeScreen() {
 *     AndroidView(
 *         factory = { ctx ->
 *             WebView(ctx).apply {
 *                 settings.javaScriptEnabled = true
 *                 settings.domStorageEnabled = true
 *                 settings.allowFileAccess = true
 *                 addJavascriptInterface(Bridge(), "AndroidBridge")
 *                 loadUrl("file:///android_asset/dji-air-3s.html")
 *             }
 *         },
 *         modifier = Modifier.fillMaxSize()
 *     )
 * }
 */
