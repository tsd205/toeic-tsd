
/* TOEIC TSD - Practice + Midnight Study */

(async () => {
  const user = await requireLogin();
  if (!user) return;

  const $ = id => document.getElementById(id);
  const progress = $("progress");

  // ===== LẤY TEST ĐÃ CHỌN =====

  let selection;

  try {
    selection = JSON.parse(
      sessionStorage.getItem("toeic_selection") || "null"
    );
  } catch {}

  if (
    !selection ||
    !Array.isArray(selection.ids) ||
    !selection.ids.length
  ) {
    progress.textContent =
      "Bạn chưa chọn Test. Quay lại trang chọn Test.";
    return;
  }

  const ids = selection.ids
    .filter(id => Number.isSafeInteger(id) && id > 0)
    .slice(0, 100);

  if (!ids.length) {
    progress.textContent = "Danh sách Test không hợp lệ.";
    return;
  }

  // ===== TẢI TEST TỪ SUPABASE =====

  const { data: tests, error: testError } =
    await supabaseClient
      .from("tests")
      .select("id,title")
      .in("id", ids)
      .eq("is_active", true);

  if (testError) {
    progress.textContent = testError.message;
    return;
  }

  const validIds = tests.map(t => t.id);

  if (!validIds.length) {
    progress.textContent =
      "Không tìm thấy Test đang hoạt động.";
    return;
  }

  const names = new Map(
    tests.map(t => [t.id, t.title])
  );

  // ===== TẢI TỪ VỰNG (PHÂN TRANG) =====

  let words = [];

  for (let from = 0; ; from += 500) {
    const { data, error } = await supabaseClient
      .from("vocabulary")
      .select(
        "id,test_id,english,vietnamese,pronunciation"
      )
      .in("test_id", validIds)
      .order("id")
      .range(from, from + 499);

    if (error) {
      progress.textContent = error.message;
      return;
    }

    words.push(...data);

    if (data.length < 500) break;
  }

  if (!words.length) {
    progress.textContent =
      "Các Test này chưa có từ vựng. Admin cần thêm từ trước.";
    return;
  }

  // ===== SẮP XẾP TỪ =====

  if (selection.mode === "random") {
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [words[i], words[j]] = [words[j], words[i]];
    }
  } else {
    const rank = new Map(
      ids.map((id, i) => [id, i])
    );

    words.sort(
      (a, b) =>
        (rank.get(a.test_id) ?? 999) -
        (rank.get(b.test_id) ?? 999) ||
        a.id - b.id
    );
  }

  // ===== BIẾN LUYỆN TẬP =====

  let index = 0;
  let englishCorrect = 0;
  let vietnameseCorrect = 0;

  const submitted = [];

  const exercise = $("exercise");
  const form = $("answerForm");
  const feedback = $("feedback");
  const next = $("next");

  exercise.hidden = false;

  const normalize = s =>
    s.normalize("NFC")
      .trim()
      .toLocaleLowerCase("vi")
      .replace(/\s+/g, " ")
      .replace(/[.!?]+$/g, "");

  // ===== PHÁT ÂM + GIẢM NHẠC =====

  let speechId = 0;

  const speak = () => {
    if (!("speechSynthesis" in window)) return;

    const id = ++speechId;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
      words[index].english
    );

    utterance.lang = "en-US";
    utterance.rate = 0.85;

    // Nhạc nền nhỏ xuống khi đọc
    window.TOEIC_LOFI?.duckMusic();

    const finishSpeech = () => {
      if (id !== speechId) return;

      window.TOEIC_LOFI?.restoreMusic();
    };

    utterance.onend = finishSpeech;
    utterance.onerror = finishSpeech;

    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      finishSpeech();
      console.warn("Speech error:", error);
    }
  };

  $("speak").onclick = speak;

  // ===== HIỂN THỊ TỪ HIỆN TẠI =====

  function render() {
    // Hủy giọng đọc cũ khi chuyển từ
    ++speechId;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    window.TOEIC_LOFI?.restoreMusic();

    progress.textContent =
      `Từ ${index + 1}/${words.length} · ` +
      `Đúng tiếng Anh: ${englishCorrect} · ` +
      `Đúng nghĩa: ${vietnameseCorrect}`;

    $("testName").textContent =
      names.get(words[index].test_id) || "Test";

    form.reset();
    feedback.replaceChildren();

    form.hidden = false;
    next.hidden = true;

    $("answerEnglish").focus();
  }

  // ===== KIỂM TRA ĐÁP ÁN =====

  form.onsubmit = e => {
    e.preventDefault();

    const word = words[index];

    const englishInput = $("answerEnglish");
    const vietnameseInput = $("answerVietnamese");

    const en =
      normalize(englishInput.value) ===
      normalize(word.english);

    // Chấp nhận nhiều nghĩa phân cách bằng ;
    const vi = word.vietnamese
      .split(";")
      .some(
        v =>
          normalize(vietnameseInput.value) ===
          normalize(v)
      );

    if (en) englishCorrect++;
    if (vi) vietnameseCorrect++;

    submitted.push({
      word,
      submitted_english: englishInput.value.trim(),
      submitted_vietnamese: vietnameseInput.value.trim(),
      en,
      vi
    });

    // Hiển thị kết quả
    feedback.replaceChildren();

    const p = document.createElement("p");

    p.textContent =
      `Tiếng Anh: ${en ? "✓ Đúng" : "✗ Sai"} · ` +
      `Nghĩa: ${vi ? "✓ Đúng" : "✗ Sai"}`;

    const answer = document.createElement("p");

    answer.textContent =
      `Đáp án: ${word.english} — ` +
      `${word.vietnamese}` +
      (word.pronunciation
        ? " " + word.pronunciation
        : "");

    feedback.append(p, answer);

    form.hidden = true;
    next.hidden = false;

    next.textContent =
      index === words.length - 1
        ? "Xem kết quả"
        : "Từ tiếp theo →";

    // ===== HIỆU ỨNG ĐÚNG / SAI =====

    if (en && vi) {
      window.TOEIC_LOFI?.correct(feedback);
    } else {
      window.TOEIC_LOFI?.wrong(feedback);
    }
  };

  // ===== LƯU KẾT QUẢ VÀO SUPABASE =====

  async function saveResults() {
    // Lưu riêng kết quả cho từng Test
    const grouped = new Map();

    for (const a of submitted) {
      if (!grouped.has(a.word.test_id)) {
        grouped.set(a.word.test_id, []);
      }

      grouped.get(a.word.test_id).push(a);
    }

    for (const [testId, items] of grouped) {
      const { data: attempt, error } =
        await supabaseClient
          .from("attempts")
          .insert({
            user_id: user.id,
            test_id: testId,
            score: items.filter(
              x => x.en && x.vi
            ).length,
            total: items.length
          })
          .select("id")
          .single();

      if (error) {
        throw new Error(error.message);
      }

      const answers = items.map(x => ({
        attempt_id: attempt.id,
        vocabulary_id: x.word.id,
        submitted_english: x.submitted_english,
        submitted_vietnamese: x.submitted_vietnamese,
        is_correct: x.en && x.vi
      }));

      for (
        let i = 0;
        i < answers.length;
        i += 100
      ) {
        const { error: answerError } =
          await supabaseClient
            .from("attempt_answers")
            .insert(answers.slice(i, i + 100));

        if (answerError) {
          throw new Error(answerError.message);
        }
      }
    }
  }

  // ===== CHUYỂN TỪ / XEM KẾT QUẢ =====

  next.onclick = async () => {
    index++;

    if (index < words.length) {
      render();
      return;
    }

    // Kết thúc giọng đọc
    ++speechId;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    window.TOEIC_LOFI?.restoreMusic();

    next.disabled = true;
    exercise.hidden = true;

    progress.textContent = "Đã hoàn thành!";

    const result = $("results");
    result.hidden = false;

    const h = document.createElement("h2");
    h.textContent = "Kết quả luyện tập";

    const p = document.createElement("p");
    p.textContent =
      `Tổng ${words.length} từ · ` +
      `Tiếng Anh đúng ${englishCorrect}/${words.length} · ` +
      `Nghĩa đúng ${vietnameseCorrect}/${words.length}`;

    const note = document.createElement("p");
    note.textContent = "Đang lưu kết quả...";

    const a = document.createElement("a");
    a.href = "dashboard.html";
    a.textContent = "← Chọn Test khác";

    result.append(h, p, note, a);

    try {
      await saveResults();

      note.textContent =
        "✓ Đã lưu kết quả vào tài khoản. " +
        "Xem trong trang Cá nhân.";
    } catch (err) {
      note.textContent =
        "⚠ Chưa lưu được kết quả: " +
        err.message +
        " (Kiểm tra đã chạy " +
        "supabase/phase3_results.sql chưa).";
    }
  };

  // ===== KHỞI ĐỘNG =====

  render();
})();
