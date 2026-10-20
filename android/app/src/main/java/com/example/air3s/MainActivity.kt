package com.example.air3s

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.graphics.Rect
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.PixelCopy
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

    /* ---------- 画面看门狗 ---------- */
    private val ui = Handler(Looper.getMainLooper())
    private var lastHealAt = 0L
    private var healCount = 0
    private var probeBitmap: Bitmap? = null
    private var probePixels: IntArray? = null
    private var canvasHadContent = false
    private var blackStreak = 0
    private val watchdog = object : Runnable {
        override fun run() {
            sampleCanvas()
            ui.postDelayed(this, 4000)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 仅 debug 包开放 WebView 调试：接 chrome://inspect 或 adb forward 到 CDP，
        // release 包不打开，避免线上多一个调试入口。
        val debuggable =
            (applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
        if (debuggable) WebView.setWebContentsDebuggingEnabled(true)

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
        startWatchdog()
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

        /**
         * 页面请求重建合成表面。
         *
         * 部分机型的 WebView 会「只保留最后一帧」——WebGL 画布整块变黑，
         * 手动转一次屏幕就恢复。这里用一次 1px 的尺寸微调，复现转屏引起的
         * surface 重建，让页面可以自己把黑屏救回来。
         */
        @JavascriptInterface
        fun nudgeSurface() {
            webView.post { nudge() }
        }
    }

    /* ---------- 原生 → 页面 的入口示例（供外部调用） ---------- */

    /**
     * 让 WebView 的合成表面重建一次。
     *
     * WebGL 画布「变黑但没崩」时，用户手动转屏能恢复，本质是转屏触发了一次
     * 视口尺寸变化，浏览器不得不重建 surface。这里把 1px 的 padding 变化
     * 当作"人工转屏"：改一下 → 触发 layout → 下一帧改回来。
     */
    private var nudging = false
    private fun nudge() {
        if (!::webView.isInitialized || nudging) return
        nudging = true
        val pad = webView.paddingTop
        webView.setPadding(0, pad + 1, 0, 0)
        webView.requestLayout()
        webView.invalidate()
        webView.postDelayed({
            webView.setPadding(0, pad, 0, 0)
            webView.requestLayout()
            webView.invalidate()
            nudging = false
        }, 48)
    }

    /* ---------- 画面看门狗 ---------- */

    /**
     * WebGL 图层被系统丢弃时，整块画布是一片纯黑（不是"很暗"，而是液晶般的 0），
     * 但页面本身还活着：没有 JS 报错，也拿不到 contextlost 事件，
     * 所以从页面里没法察觉。这里从原生侧直接抓屏幕像素：
     *
     *   1. 每 4s 用 PixelCopy 取屏幕中段（3D 画布区，不含上下 UI）
     *   2. 统计亮度，判断"有没有内容"
     *   3. 一旦出现「之前有内容 → 连续两次全黑」，就自动做一次 surface 重建
     *
     * 只认"从有到无"的跳变，冷启动阶段的黑屏（还在加载）不会误触发。
     */
    private fun startWatchdog() {
        ui.removeCallbacks(watchdog)
        ui.postDelayed(watchdog, 6000)
    }

    private fun stopWatchdog() {
        ui.removeCallbacks(watchdog)
    }

    private fun sampleCanvas() {
        if (!::webView.isInitialized || isFinishing) return
        if (!hasWindowFocus()) return
        val w = webView.width
        val h = webView.height
        if (w <= 0 || h <= 0) return

        // 只取中间那条"模型带"：顶部工具条和底部面板都排除在外
        val rect = Rect(0, (h * 0.18f).toInt(), w, (h * 0.58f).toInt())
        if (rect.width() <= 0 || rect.height() <= 0) return

        val bmp = probeBitmap?.takeIf { it.width == rect.width() && it.height == rect.height() }
            ?: Bitmap.createBitmap(rect.width(), rect.height(), Bitmap.Config.ARGB_8888)
                .also { probeBitmap = it }
        if (probePixels?.size != bmp.width * bmp.height) {
            probePixels = IntArray(bmp.width * bmp.height)
        }
        val pixels = probePixels ?: return

        try {
            PixelCopy.request(window, rect, bmp, { result ->
                if (result == PixelCopy.SUCCESS) analyzeCanvas(bmp, pixels)
            }, ui)
        } catch (e: IllegalArgumentException) {
            // 窗口还没准备好，下一个周期再试
        }
    }

    private fun analyzeCanvas(bmp: Bitmap, pixels: IntArray) {
        bmp.getPixels(pixels, 0, bmp.width, 0, 0, bmp.width, bmp.height)

        var bright = 0
        var total = 0
        var sum = 0L
        var i = 0
        while (i < pixels.size) {
            val p = pixels[i]
            val lum = ((p shr 16 and 0xFF) + (p shr 8 and 0xFF) + (p and 0xFF)) / 3
            sum += lum
            if (lum > 30) bright++
            total++
            i += 4   // 每 4 个像素取样即可，够判断"是不是整片黑"
        }
        if (total == 0) return

        val mean = sum.toDouble() / total
        val contentRatio = bright.toDouble() / total

        if (contentRatio > 0.002) {
            canvasHadContent = true
            blackStreak = 0
            return
        }
        if (!canvasHadContent) return

        // 场景背景本身就是深色（#05070c），正常画面均值 6 以上；
        // 合成失败时是彻底的 0，区分度很高
        if (mean < 2.0) {
            blackStreak++
        } else {
            blackStreak = 0
            return
        }

        if (blackStreak < 2) return
        if (System.currentTimeMillis() - lastHealAt < 12_000) return

        lastHealAt = System.currentTimeMillis()
        blackStreak = 0
        healCount++
        android.util.Log.w("Air3S", "检测到画布全黑（mean=$mean），第 $healCount 次重建合成表面")
        nudge()
        val degrade = if (healCount >= 2) {
            // 修了两次还是黑：多半是这台机器的 GPU 管线跑不动 Bloom 后处理（模拟器常见），
            // 让页面降一档画质，牺牲辉光换稳定
            "window.DroneRender && window.DroneRender.degrade();"
        } else {
            ""
        }
        webView.evaluateJavascript(
            "$degrade window.DroneRender && (window.DroneRender.resize(), window.DroneRender.kick(true))",
            null
        )
    }

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
        // 退过后台再回来，画布经常停在最后一帧：主动重建一次，并让页面同步尺寸
        nudge()
        webView.postDelayed({
            webView.evaluateJavascript(
                "window.DroneRender && window.DroneRender.resize(), " +
                    "window.DroneRender && window.DroneRender.kick()",
                null
            )
        }, 180)
    }

    /**
     * 解锁屏幕 / 从最近任务切回来时会重新拿到焦点，
     * 这也是画布最容易停在黑屏的时机，顺手做一次恢复。
     */
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (!hasFocus || !::webView.isInitialized) return
        applyImmersive()
        nudge()
        webView.postDelayed({
            webView.evaluateJavascript(
                "window.DroneRender && window.DroneRender.kick()",
                null
            )
        }, 200)
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
        stopWatchdog()
        webView.destroy()
        super.onDestroy()
    }
}
