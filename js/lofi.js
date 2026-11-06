
/* TOEIC TSD - Midnight Chillhop Player */

(() => {
  "use strict";

  if (window.TOEIC_LOFI) return;

  const audio = new Audio("assets/audio/chillhop.mp3");
  audio.loop = true;
  audio.preload = "none";

  const read = (key, fallback) => {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const save = (key, value) => {
    try {
      localStorage.setItem(key, String(value));
    } catch {}
  };

  let volume = Number(read("tsd_music_volume", "0.20"));
  if (!Number.isFinite(volume)) volume = 0.20;
  volume = Math.max(0, Math.min(1, volume));
  audio.volume = volume;

  let enabled = read("tsd_music_enabled", "true") === "true";
  let feedbackSound =
    read("tsd_feedback_enabled", "false") === "true";

  let audioContext = null;
  let ducked = false;

  function updateUI() {
    const button = document.getElementById("tsdMusicPlay");
    const status = document.getElementById("tsdMusicStatus");

    if (button) {
      button.textContent = audio.paused ? "▶" : "Ⅱ";
      button.setAttribute(
        "aria-label",
        audio.paused ? "Phát nhạc" : "Tạm dừng nhạc"
      );
    }

    if (status) {
      status.textContent = audio.paused
        ? "Đang tạm dừng"
        : "Đang phát · Chillhop";
    }
  }

  async function playMusic() {
    if (!enabled) return;

    try {
      await audio.play();
    } catch {
      const status = document.getElementById("tsdMusicStatus");
      if (status) {
        status.textContent = "Chạm để bật nhạc 🎵";
      }
    }
    updateUI();
  }

  function pauseMusic() {
    enabled = false;
    save("tsd_music_enabled", "false");
    audio.pause();
    updateUI();
  }

  async function toggleMusic() {
    if (!audio.paused) {
      pauseMusic();
    } else {
      enabled = true;
      save("tsd_music_enabled", "true");
      await playMusic();
    }
  }

  function duckMusic() {
    ducked = true;
    audio.volume = volume * 0.12;
  }

  function restoreMusic() {
    ducked = false;
    audio.volume = volume;
  }

  function playTone(frequency, duration) {
    if (!feedbackSound) return;

    try {
      const AudioCtx =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContext) audioContext = new AudioCtx();

      if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
      }

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(
        0.035, now + 0.015
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001, now + duration
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    } catch (error) {
      console.warn("Feedback sound:", error);
    }
  }

  function animate(element, className) {
    if (!(element instanceof Element)) return;

    element.classList.remove("lofi-correct", "lofi-wrong");
    void element.offsetWidth;
    element.classList.add(className);

    setTimeout(() => element.classList.remove(className), 600);
  }

  function correct(element) {
    animate(element, "lofi-correct");
    playTone(587.33, 0.16);
    setTimeout(() => playTone(783.99, 0.20), 110);
  }

  function wrong(element) {
    animate(element, "lofi-wrong");
    playTone(220, 0.16);
  }

  function init() {
    if (document.getElementById("tsdMusicPlayer")) return;

    const wrapper = document.createElement("div");
    wrapper.id = "tsdMusicPlayer";

    wrapper.innerHTML = `
      <div id="tsdMusicPanel" hidden>
        <div class="tsd-music-title">Midnight Chillhop</div>
        <div class="tsd-music-subtitle">
          Stay calm. Stay focused.
        </div>

        <div class="tsd-music-controls">
          <button id="tsdMusicPlay" type="button">▶</button>
          <div>
            <strong>Late Night Study</strong>
            <small id="tsdMusicStatus">Đang tạm dừng</small>
          </div>
        </div>

        <label for="tsdMusicVolume">Âm lượng</label>
        <input
          id="tsdMusicVolume"
          type="range"
          min="0"
          max="100"
          value="20"
        >

        <label class="tsd-music-check">
          <input id="tsdFeedbackSound" type="checkbox">
          Âm báo đúng / sai
        </label>
      </div>

      <button
        id="tsdMusicFab"
        type="button"
        aria-label="Mở trình phát nhạc"
        aria-expanded="false"
        aria-controls="tsdMusicPanel"
      >♫</button>
    `;

    document.body.appendChild(wrapper);

    const panel = document.getElementById("tsdMusicPanel");
    const fab = document.getElementById("tsdMusicFab");
    const volumeInput = document.getElementById("tsdMusicVolume");
    const soundInput = document.getElementById("tsdFeedbackSound");

    volumeInput.value = Math.round(volume * 100);
    soundInput.checked = feedbackSound;

    fab.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      fab.setAttribute("aria-expanded", String(!panel.hidden));
    });

    document.getElementById("tsdMusicPlay")
      .addEventListener("click", toggleMusic);

    volumeInput.addEventListener("input", () => {
      volume = Number(volumeInput.value) / 100;
      audio.volume = ducked ? volume * 0.12 : volume;
      save("tsd_music_volume", volume);
    });

    soundInput.addEventListener("change", () => {
      feedbackSound = soundInput.checked;
      save("tsd_feedback_enabled", feedbackSound);
    });

    audio.addEventListener("play", updateUI);
    audio.addEventListener("pause", updateUI);

    // Tự thử phát khi mở trang
    if (enabled) {
      playMusic();
    }

    // Nếu trình duyệt chặn autoplay,
    // thử lại khi người dùng tương tác lần đầu
    const startOnInteraction = () => {
      if (enabled && audio.paused) {
        playMusic();
      }
    };

    document.addEventListener("pointerdown", startOnInteraction);
    document.addEventListener("keydown", startOnInteraction);

    updateUI();
  }

  window.TOEIC_LOFI = {
    correct,
    wrong,
    toggleMusic,
    pauseMusic,
    duckMusic,
    restoreMusic
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
