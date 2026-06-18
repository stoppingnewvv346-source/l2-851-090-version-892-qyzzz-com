import { H as Hls } from '../vendor/hls-vendor-dru42stk.js';

const setupPlayer = (box) => {
  const video = box.querySelector('video');
  const trigger = box.querySelector('[data-player-trigger]');
  const cover = box.querySelector('.player-cover');
  const message = box.querySelector('[data-player-message]');
  const source = box.dataset.src;
  const title = box.dataset.title || '影片';
  let initialized = false;

  const setMessage = (text) => {
    if (message) {
      message.textContent = text;
    }
  };

  const hideCover = () => {
    if (cover) {
      cover.classList.add('is-hidden');
    }
  };

  const initialize = () => {
    if (initialized) {
      video.play().catch(() => undefined);
      return;
    }

    initialized = true;
    hideCover();

    if (!source) {
      setMessage('当前影片暂无可用播放源。');
      return;
    }

    setMessage(`正在加载《${title}》高清播放源...`);

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source;
      video.addEventListener('loadedmetadata', () => {
        setMessage('播放源已就绪。');
        video.play().catch(() => undefined);
      }, { once: true });
      video.addEventListener('error', () => setMessage('播放源加载失败，请刷新后重试。'));
      return;
    }

    const HlsClass = Hls && (Hls.default || Hls);

    if (HlsClass && HlsClass.isSupported && HlsClass.isSupported()) {
      const hls = new HlsClass({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(source);
      hls.attachMedia(video);
      hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
        setMessage('播放源已就绪。');
        video.play().catch(() => undefined);
      });
      hls.on(HlsClass.Events.ERROR, (_event, data) => {
        if (data && data.fatal) {
          setMessage('播放过程中出现错误，请刷新页面或稍后再试。');
          hls.destroy();
        }
      });
      return;
    }

    setMessage('当前浏览器不支持 HLS 播放，请更换现代浏览器访问。');
  };

  if (trigger && video) {
    trigger.addEventListener('click', initialize);
  }
};

document.querySelectorAll('.player-box').forEach(setupPlayer);
