(function () {
    "use strict";

    var players = new WeakMap();

    function setMessage(shell, text, isError) {
        var message = shell.querySelector("[data-player-message]");
        if (message) {
            message.textContent = text;
        }
        shell.classList.toggle("is-error", Boolean(isError));
    }

    function playVideo(video) {
        var promise = video.play();
        if (promise && typeof promise.catch === "function") {
            promise.catch(function () {
                // Some browsers require a second manual click on the native control.
            });
        }
    }

    function destroyExisting(shell) {
        var existing = players.get(shell);
        if (existing && typeof existing.destroy === "function") {
            existing.destroy();
        }
        players.delete(shell);
    }

    function startPlayer(shell) {
        var video = shell.querySelector("video");
        var source = shell.getAttribute("data-hls-src");
        if (!video || !source) {
            setMessage(shell, "未找到可用播放源。", true);
            return;
        }

        shell.classList.remove("is-error");
        setMessage(shell, "正在加载播放源，请稍候……", false);
        destroyExisting(shell);

        if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = source;
            shell.classList.add("is-playing");
            playVideo(video);
            return;
        }

        if (window.Hls && window.Hls.isSupported()) {
            var hls = new window.Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });
            players.set(shell, hls);
            hls.loadSource(source);
            hls.attachMedia(video);
            hls.on(window.Hls.Events.MANIFEST_PARSED, function () {
                shell.classList.add("is-playing");
                playVideo(video);
            });
            hls.on(window.Hls.Events.ERROR, function (event, data) {
                if (!data || !data.fatal) {
                    return;
                }
                if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
                    setMessage(shell, "网络加载异常，正在重新连接播放源……", true);
                    hls.startLoad();
                    return;
                }
                if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
                    setMessage(shell, "媒体解码异常，正在尝试恢复播放……", true);
                    hls.recoverMediaError();
                    return;
                }
                setMessage(shell, "播放源加载失败，请稍后重试。", true);
                hls.destroy();
            });
            return;
        }

        setMessage(shell, "当前浏览器不支持 HLS 播放，请更换浏览器或启用 HLS 支持。", true);
    }

    document.addEventListener("DOMContentLoaded", function () {
        document.querySelectorAll(".player-shell").forEach(function (shell) {
            var button = shell.querySelector("[data-player-start]");
            if (button) {
                button.addEventListener("click", function () {
                    startPlayer(shell);
                });
            }
        });
    });
}());
