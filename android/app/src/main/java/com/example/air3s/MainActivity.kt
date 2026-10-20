package com.example.air3s

import android.annotation.SuppressLint
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast

/**
 * DJI Air 3S 三维拆解可视化 —— Android 宿主
 *
 * 页面本体是仓库根目录的 index.html（Three.js 已内联，单文件、零外部资源），
 * 构建时由 Gradle 的 syncWebPage 任务复制到 assets/dji-air-3s.html，
 * WebView 用 file:///android_asset/ 加载，WebGL 由系统 Chromium 内核提供。
 *
 * 本工程是**演示宿主**：不引入 DJI MSDK，飞行指令走演示回执，
 * 保证 APK 能独立安装运行。真机接入见 msdk-sample/ 目录。
 */
class MainActivity : android.app.Activity() {

    private lateinit var webView: WebView

    /** 是否已把指令转发给真机（演示版恒为 false） */
    private val realFlightControllerAttached = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = true              // assets 走 file:///android_asset/
                allowContentAccess = false
                cacheMode = WebSettings.LOAD_NO_CACHE
                useWideViewPort = true
                loadWithOverviewMode = true
                setSupportZoom(false)
                builtInZoomControls = false
                mediaPlaybackRequiresUserGesture = false
                // 页面无网络依赖，禁用混合内容，避免误加载外部资源
                blockNetworkLoads = true
                blockNetworkImage = true
            }

            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            isLongClickable = false
            setBackgroundColor(0xFF05070C.toInt())
            // 让 WebView 独立图层合成，WebGL 在这类机型上更稳
            setLayerType(View.LAYER_TYPE_HARDWARE, null)

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView,
                    request: WebResourceRequest
                ): Boolean = true   // 单页应用，禁止任何跳转
            }
            webChromeClient = WebChromeClient()

            addJavascriptInterface(Bridge(), "AndroidBridge")
            loadUrl("file:///android_asset/dji-air-3s.html")
        }

        setContentView(webView)
        applyImmersive()
    }

    /** 全屏沉浸：隐藏状态栏 / 导航栏，画面延伸到刘海区 */
    @Suppress("DEPRECATION")
    private fun applyImmersive() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.apply {
                hide(WindowInsets.Type.systemBars())
                systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                )
        }
    }

    /** 页面 → 原生 的回调集合 */
    inner class Bridge {

        /**
         * 飞行指令：页面指令台点击「起飞 / 降落 / 返航 …」后触发。
         *
         * 演示版没有接飞控，这里直接返回成功回执，让 UI 状态机跑通。
         * 接真机时把 dispatch 换成 MSDK 调用，失败就回 false，
         * 页面会自动回滚状态（不会出现「UI 说起飞了、飞机没动」）。
         */
        @JavascriptInterface
        fun onFlightEvent(command: String, mode: String, stateJson: String) {
            val safeCmd = command.replace(Regex("[^a-zA-Z]"), "")
            if (realFlightControllerAttached) return

            webView.postDelayed({
                val note = "演示回执 · 未接入飞控（指令 $safeCmd 仅在界面内生效）"
                val escaped = note.replace("\\", "\\\\").replace("'", "\\'")
                webView.evaluateJavascript(
                    "window.DroneNative && window.DroneNative.onResult('$safeCmd', true, '$escaped')",
                    null
                )
            }, 240)
        }

        @JavascriptInterface
        fun onPartSelected(id: String, name: String) {
            // 解剖模式下点选部件：这里只做轻提示，可换成埋点 / 原生详情页
            webView.post {
                Toast.makeText(this@MainActivity, name, Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface
        fun onReady() {
            // 首帧就绪：如需关闭原生启动图，在这里处理
        }
    }

    /* ---------- 原生 → 页面 的入口示例（供外部调用） ---------- */

    fun selectPart(partId: String) {
        webView.evaluateJavascript("window.__selectPart && window.__selectPart('$partId')", null)
    }

    fun explodeAll() {
        webView.evaluateJavascript("window.__explodeAll && window.__explodeAll()", null)
    }

    fun sendCommand(command: String) {
        val safe = command.replace(Regex("[^a-zA-Z]"), "")
        webView.evaluateJavascript("window.DroneCmd && window.DroneCmd.exec('$safe')", null)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        webView.resumeTimers()     // 恢复 requestAnimationFrame
    }

    override fun onPause() {
        webView.onPause()
        webView.pauseTimers()      // 退后台停渲染，省电
        super.onPause()
    }

    /**
     * 返回键：先让页面退出飞行控制台 / 取消选中，
     * 页面确实没有可回退状态时才退出 App。
     */
    @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
    override fun onBackPressed() {
        webView.evaluateJavascript("window.__deselect ? window.__deselect() : false") { result ->
            if (result?.contains("true") != true) finish()
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
