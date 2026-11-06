
/* =========================================
   TOEIC TSD - MIDNIGHT STUDY MUSIC PLAYER
   ========================================= */

(() => {
  "use strict";

  if (window.TOEIC_LOFI) return;

  // 1. Danh sách nhạc
  const tracks = {
    piano: {
      name: "Piano Night",
      file: "assets/audio/piano.mp3",
      icon: "🎹"
    },
    study: {
      name: "Study Music",
      file: "assets/audio/study.mp3",
      icon: "📖"
    },
    lofi: {
      name: "Lofi Sound",
      file: "assets/audio/lofi.mp3",
      icon: "🌙"
    }
  };

  // 2. Lưu và đọc cài đặt
  function read(key, fallback) {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // Không ảnh hưởng website nếu localStorage bị chặn
    }
  }

  // 3. Cài đặt mặc định
  let track = read("tsd_track", "study");

  if (!tracks[track]) {
    track = "study";
  }

  let volume = Number(
    read("tsd_music_volume", "0.10")
  );

  if (!Number.isFinite(volume)) {
    volume = 0.10;
  }

  volume = Math.max(0, Math.min(1, volume));

  let enabled =
    read("tsd_music_enabled", "true") === "true";

  let feedbackSound =
    read("tsd_feedback_enabled", "false") === "true";

  let ducked = false;
  let audioContext = null;
  let playRequest = 0;

  // 4. Tạo trình phát
  const audio = new Audio(tracks[track].file);

  audio.loop = true;
  audio.preload = "none";
  audio.volume = volume;

  const $ = id => document.getElementById(id);

  function setStatus(message) {
    const status = $("tsdMusicStatus");

    if (status) {
      status.textContent = message;
    }
  }

  // 5. Cập nhật giao diện
  function updateUI() {
    const playButton = $("tsdMusicPlay");
    const fab = $("tsdMusicFab");
    const select = $("tsdTrackSelect");

    if (playButton) {
      playButton.textContent =
        audio.paused ? "▶" : "Ⅱ";

      playButton.setAttribute(
        "aria-label",
        audio.paused
          ? "Phát nhạc"
          : "Tạm dừng nhạc"
      );
    }

    if (fab) {
      fab.textContent =
        audio.paused ? "♪" : "♫";

      fab.classList.toggle(
        "is-playing",
        !audio.paused
      );
    }

    if (select) {
      select.value = track;
    }
  }

  // 6. Phát nhạc
  async function playMusic() {
    if (!enabled) return;

    const request = ++playRequest;

    try {
      await audio.play();

      if (!enabled || request !== playRequest) {
        if (!enabled) audio.pause();
        return;
      }

      setStatus(
        "Đang phát · " + tracks[track].name
      );

    } catch (error) {
      if (enabled && request === playRequest) {
        setStatus("Nhấn ▶ để phát nhạc");
      }
    }

    updateUI();
  }

  // 7. Tạm dừng
  function pauseMusic() {
    enabled = false;
    ++playRequest;

    save("tsd_music_enabled", "false");

    audio.pause();

    setStatus("Đã tạm dừng");
    updateUI();
  }

  // 8. Bật / tắt
  function toggleMusic() {
    if (enabled && !audio.paused) {
      pauseMusic();
    } else {
      enabled = true;

      save("tsd_music_enabled", "true");

      return playMusic();
    }
  }

  // 9. Đổi bài nhạc
  function changeTrack(nextTrack) {
    if (!tracks[nextTrack]) return;

    ++playRequest;
    audio.pause();

    track = nextTrack;

    save("tsd_track", track);

    audio.src = tracks[track].file;
    audio.load();

    audio.volume = ducked
      ? volume * 0.12
      : volume;

    setStatus(
      "Đã chọn · " + tracks[track].name
    );

    updateUI();

    if (enabled) {
      return playMusic();
    }
  }

  // 10. Điều chỉnh âm lượng
  function setVolume(nextVolume) {
    const next = Number(nextVolume);

    if (!Number.isFinite(next)) return;

    volume = Math.max(0, Math.min(1, next));

    audio.volume = ducked
      ? volume * 0.12
      : volume;

    save("tsd_music_volume", volume);
  }

  // 11. Giảm nhạc khi phát âm TOEIC
  function duckMusic() {
    ducked = true;
    audio.volume = volume * 0.12;
  }

  function restoreMusic() {
    ducked = false;
    audio.volume = volume;
  }

  // 12. Âm báo đúng / sai
  function playTone(frequency, duration) {
    if (!feedbackSound) return;

    try {
      const AudioCtx =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioCtx) return;

      if (!audioContext) {
        audioContext = new AudioCtx();
      }

      if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
      }

      const oscillator =
        audioContext.createOscillator();

      const gain = audioContext.createGain();
      const now = audioContext.currentTime;

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(
        0.0001, now
      );

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

  // 13. Hiệu ứng trả lời
  function animate(element, className) {
    if (!(element instanceof Element)) return;

    element.classList.remove(
      "lofi-correct",
      "lofi-wrong"
    );

    void element.offsetWidth;

    element.classList.add(className);

    setTimeout(() => {
      element.classList.remove(className);
    }, 600);
  }

  function correct(element) {
    animate(element, "lofi-correct");

    playTone(587.33, 0.16);

    setTimeout(() => {
      playTone(783.99, 0.20);
    }, 110);
  }

  function wrong(element) {
    animate(element, "lofi-wrong");

    playTone(220, 0.16);
  }

  // 14. Tạo giao diện trình phát
  function init() {
    if ($("tsdMusicPlayer")) return;

    const wrapper = document.createElement("div");

    wrapper.id = "tsdMusicPlayer";

    wrapper.innerHTML = `
      <div id="tsdMusicPanel" hidden>

        <div class="tsd-music-title">
          Midnight Study
        </div>

        <div class="tsd-music-subtitle">
          A quiet space to focus.
        </div>

        <label for="tsdTrackSelect">
          Không gian âm thanh
        </label>

        <select id="tsdTrackSelect">
          <option value="piano">
            🎹 Piano Night
          </option>

          <option value="study">
            📖 Study Music
          </option>

          <option value="lofi">
            🌙 Lofi Sound
          </option>
        </select>

        <div class="tsd-music-controls">

          <button
            id="tsdMusicPlay"
            type="button"
            aria-label="Phát nhạc"
          >▶</button>

          <div>
            <strong>Study Sounds</strong>

            <small
              id="tsdMusicStatus"
              role="status"
            >
              Đang chuẩn bị
            </small>
          </div>

        </div>

        <label for="tsdMusicVolume">
          Âm lượng
        </label>

        <input
          id="tsdMusicVolume"
          type="range"
          min="0"
          max="100"
          value="10"
        >

        <label class="tsd-music-check">
          <input
            id="tsdFeedbackSound"
            type="checkbox"
          >
          Âm báo đúng / sai
        </label>

      </div>

      <button
        id="tsdMusicFab"
        type="button"
        aria-label="Mở bảng âm thanh"
        aria-expanded="false"
        aria-controls="tsdMusicPanel"
      >♪</button>
    `;

    document.body.appendChild(wrapper);

    const panel = $("tsdMusicPanel");
    const fab = $("tsdMusicFab");

    const volumeInput =
      $("tsdMusicVolume");

    const soundInput =
      $("tsdFeedbackSound");

    const trackSelect =
      $("tsdTrackSelect");

    trackSelect.value = track;

    volumeInput.value =
      Math.round(volume * 100);

    soundInput.checked =
      feedbackSound;

    // Mở / đóng bảng nhạc
    fab.addEventListener("click", () => {
      panel.hidden = !panel.hidden;

      fab.setAttribute(
        "aria-expanded",
        String(!panel.hidden)
      );
    });

    // Phát / tạm dừng
    $("tsdMusicPlay").addEventListener(
      "click",
      toggleMusic
    );

    // Đổi nhạc
    trackSelect.addEventListener(
      "change",
      event => {
        changeTrack(event.target.value);
      }
    );

    // Âm lượng
    volumeInput.addEventListener(
      "input",
      () => {
        setVolume(
          Number(volumeInput.value) / 100
        );
      }
    );

    // Âm báo đúng / sai
    soundInput.addEventListener(
      "change",
      () => {
        feedbackSound = soundInput.checked;

        save(
          "tsd_feedback_enabled",
          feedbackSound
        );
      }
    );

    audio.addEventListener(
      "play",
      updateUI
    );

    audio.addEventListener(
      "pause",
      updateUI
    );

    audio.addEventListener(
      "error",
      () => {
        setStatus(
          "Không tải được file âm thanh"
        );
      }
    );

    // Đóng menu bằng Escape
    document.addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Escape" &&
          !panel.hidden
        ) {
          panel.hidden = true;

          fab.setAttribute(
            "aria-expanded",
            "false"
          );

          fab.focus();
        }
      }
    );

    // 15. Tự thử phát khi vào web
    if (enabled) {
      playMusic();
    }

    // Nếu trình duyệt chặn tự phát,
    // thử lại sau tương tác đầu tiên.
    const retryOnInteraction = () => {
      if (enabled && audio.paused) {
        playMusic();
      }
    };

    document.addEventListener(
      "pointerdown",
      retryOnInteraction,
      { once: true }
    );

    document.addEventListener(
      "keydown",
      retryOnInteraction,
      { once: true }
    );

    updateUI();
  }

  // 16. Cho phép practice.html gọi hiệu ứng
  window.TOEIC_LOFI = {
    correct,
    wrong,
    toggleMusic,
    pauseMusic,
    changeTrack,
    setVolume,
    duckMusic,
    restoreMusic
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})();
