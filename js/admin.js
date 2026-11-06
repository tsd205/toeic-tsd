
const db = window.supabase.createClient(
  window.TOEIC_CONFIG.SUPABASE_URL,
  window.TOEIC_CONFIG.SUPABASE_ANON_KEY
);

const $ = id => document.getElementById(id);

const wordTest = $("wordTest");
const wordMessage = $("wordMessage");

let openedTestId = null;

// ==============================
// THÔNG BÁO
// ==============================

function showWordMessage(message, isError = false) {
  wordMessage.textContent = message;
  wordMessage.style.color = isError
    ? "#dc3545"
    : "#16a34a";
}

function showMessage(message, isError = false) {
  const el = $("message");
  el.textContent = message;
  el.style.color = isError
    ? "#dc3545"
    : "#16a34a";
}

// ==============================
// KIỂM TRA ADMIN
// ==============================

async function init() {
  const { data: { user }, error: authError } =
    await db.auth.getUser();

  if (authError || !user) {
    location.href = "login.html";
    return;
  }

  const { data: profile, error } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || profile?.role !== "admin") {
    document.body.textContent =
      "Bạn không có quyền truy cập trang Admin.";
    return;
  }

  $("adminPage").hidden = false;

  await loadTests();
  await loadWordTests();
}

// ==============================
// DANH SÁCH TEST GỌN
// ==============================

async function loadTests() {
  const list = $("testList");

  const { data, error } = await db
    .from("tests")
    .select("id,title,description")
    .order("title");

  if (error) {
    list.textContent = error.message;
    return;
  }

  list.replaceChildren();

  if (!data?.length) {
    list.textContent = "Chưa có Test nào.";
    return;
  }

  for (const test of data) {
    const card = document.createElement("div");
    card.className = "test-card";

    const header = document.createElement("div");
    header.className = "test-header";

    // Nút mở từ vựng
    const open = document.createElement("button");
    open.type = "button";
    open.className = "test-open";
    open.dataset.title = test.title;

    // Nút sửa tên Test
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "test-icon";
    edit.textContent = "✏️";
    edit.title = "Sửa tên Test";
    edit.setAttribute("aria-label", "Sửa tên " + test.title);

    edit.onclick = () => editTest(test);

    // Nút xóa Test
    const del = document.createElement("button");
    del.type = "button";
    del.className = "test-icon danger";
    del.textContent = "🗑️";
    del.title = "Xóa Test";
    del.setAttribute("aria-label", "Xóa " + test.title);

    del.onclick = () => deleteTest(test);

    const wordsBox = document.createElement("div");
    wordsBox.className = "test-words";
    wordsBox.hidden = true;

    function setOpenState(isOpen) {
      wordsBox.hidden = !isOpen;
      open.textContent =
        (isOpen ? "📖 " : "📚 ") +
        test.title +
        (isOpen ? " ▲" : " ▼");
      open.setAttribute("aria-expanded", String(isOpen));
    }

    setOpenState(false);

    open.onclick = async () => {
      if (!wordsBox.hidden) {
        setOpenState(false);
        openedTestId = null;
        return;
      }

      // Đóng các Test khác
      document.querySelectorAll(".test-words")
        .forEach(box => {
          box.hidden = true;
        });

      document.querySelectorAll(".test-open")
        .forEach(button => {
          button.textContent =
            "📚 " + button.dataset.title + " ▼";
          button.setAttribute("aria-expanded", "false");
        });

      openedTestId = String(test.id);
      setOpenState(true);

      await loadTestWords(test.id, wordsBox);
    };

    header.append(open, edit, del);
    card.append(header, wordsBox);
    list.append(card);

    // Mở lại Test đang xem sau khi cập nhật
    if (String(test.id) === openedTestId) {
      setOpenState(true);
      await loadTestWords(test.id, wordsBox);
    }
  }
}

// ==============================
// THÊM TEST
// ==============================

$("testForm").onsubmit = async event => {
  event.preventDefault();

  const title = $("title").value.trim();
  const description = $("description").value.trim();

  if (!title) return;

  const { error } = await db
    .from("tests")
    .insert({
      title,
      description,
      is_active: true
    });

  if (error) {
    showMessage(error.message, true);
    return;
  }

  event.target.reset();
  showMessage("Đã thêm Test thành công!");

  await loadTests();
  await loadWordTests();
};

// ==============================
// SỬA TÊN TEST
// ==============================

async function editTest(test) {
  const title = prompt(
    "Nhập tên Test mới:",
    test.title
  );

  if (title === null || !title.trim()) return;

  const description = prompt(
    "Mô tả Test:",
    test.description || ""
  );

  if (description === null) return;

  const { error } = await db
    .from("tests")
    .update({
      title: title.trim(),
      description
    })
    .eq("id", test.id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadTests();
  await loadWordTests();
  showMessage("Đã cập nhật tên Test!");
}

// ==============================
// XÓA TEST
// ==============================

async function deleteTest(test) {
  if (!confirm(
    `Bạn chắc chắn muốn xóa "${test.title}"?\n` +
    "Thao tác có thể ảnh hưởng đến dữ liệu liên quan."
  )) return;

  const { error } = await db
    .from("tests")
    .delete()
    .eq("id", test.id);

  if (error) {
    alert(error.message);
    return;
  }

  if (openedTestId === String(test.id)) {
    openedTestId = null;
  }

  await loadTests();
  await loadWordTests();

  showMessage("Đã xóa Test!");
}

// ==============================
// DANH SÁCH TEST CHO FORM TỪ
// ==============================

async function loadWordTests() {
  const previous = wordTest.value;

  const { data, error } = await db
    .from("tests")
    .select("id,title")
    .order("title");

  if (error) {
    showWordMessage(error.message, true);
    return;
  }

  wordTest.replaceChildren();

  for (const test of data || []) {
    wordTest.add(
      new Option(test.title, String(test.id))
    );
  }

  if (
    data?.some(test =>
      String(test.id) === previous
    )
  ) {
    wordTest.value = previous;
  }
}

// ==============================
// TỪ VỰNG TRONG TEST
// ==============================

async function loadTestWords(testId, container) {
  container.textContent = "Đang tải từ vựng...";

  const { data, error } = await db
    .from("vocabulary")
    .select(
      "id,english,vietnamese,pronunciation,word_type,example"
    )
    .eq("test_id", testId)
    .order("id")
    .limit(1000);

  container.replaceChildren();

  if (error) {
    container.textContent = error.message;
    return;
  }

  if (!data?.length) {
    container.textContent =
      "Test này chưa có từ vựng.";
    return;
  }

  const count = document.createElement("p");
  count.textContent =
    `📖 ${data.length} từ vựng đang hiển thị`;

  container.append(count);

  for (const word of data) {
    const row = document.createElement("div");
    row.className = "word-row";

    const title = document.createElement("strong");
    title.textContent =
      `${word.english} — ${word.vietnamese}`;

    const info = document.createElement("p");
    info.className = "word-info";

    info.textContent = [
      word.pronunciation,
      word.word_type,
      word.example
    ].filter(Boolean).join(" · ");

    const actions = document.createElement("div");
    actions.className = "word-actions";

    // NGHE
    const listen = document.createElement("button");
    listen.type = "button";
    listen.textContent = "🔊 Nghe";

    listen.onclick = () => {
      if (!("speechSynthesis" in window)) {
        alert("Trình duyệt không hỗ trợ phát âm.");
        return;
      }

      speechSynthesis.cancel();

      const speech =
        new SpeechSynthesisUtterance(word.english);

      speech.lang = "en-US";
      speech.rate = 0.9;

      speechSynthesis.speak(speech);
    };

    // SỬA TỪ
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "✏️ Sửa";

    edit.onclick = async () => {
      const english = prompt(
        "Tiếng Anh:",
        word.english
      );

      if (english === null || !english.trim()) return;

      const vietnamese = prompt(
        "Nghĩa tiếng Việt:",
        word.vietnamese
      );

      if (vietnamese === null || !vietnamese.trim()) {
        return;
      }

      const pronunciation = prompt(
        "Phiên âm:",
        word.pronunciation || ""
      );

      if (pronunciation === null) return;

      const word_type = prompt(
        "Từ loại:",
        word.word_type || ""
      );

      if (word_type === null) return;

      const example = prompt(
        "Câu ví dụ:",
        word.example || ""
      );

      if (example === null) return;

      const { error } = await db
        .from("vocabulary")
        .update({
          english: english.trim(),
          vietnamese: vietnamese.trim(),
          pronunciation,
          word_type,
          example
        })
        .eq("id", word.id)
        .eq("test_id", testId);

      if (error) {
        alert("Lỗi sửa từ: " + error.message);
        return;
      }

      showWordMessage("Đã sửa từ thành công!");
      await loadTestWords(testId, container);
    };

    // XÓA TỪ
    const del = document.createElement("button");
    del.type = "button";
    del.className = "danger";
    del.textContent = "🗑️ Xóa";

    del.onclick = async () => {
      if (!confirm(
        `Xóa từ "${word.english}"?`
      )) return;

      const { error } = await db
        .from("vocabulary")
        .delete()
        .eq("id", word.id)
        .eq("test_id", testId);

      if (error) {
        alert("Lỗi xóa từ: " + error.message);
        return;
      }

      showWordMessage("Đã xóa từ!");
      await loadTestWords(testId, container);
    };

    actions.append(listen, edit, del);
    row.append(title, info, actions);
    container.append(row);
  }

  if (data.length === 1000) {
    const note = document.createElement("p");
    note.textContent =
      "Chỉ đang hiển thị 1000 từ đầu tiên.";
    container.append(note);
  }
}

// ==============================
// THÊM TỪ ĐƠN LẺ
// ==============================

$("wordForm").onsubmit = async event => {
  event.preventDefault();

  if (!wordTest.value) {
    showWordMessage("Hãy chọn Test trước.", true);
    return;
  }

  const row = {
    test_id: Number(wordTest.value),
    english: $("english").value.trim(),
    vietnamese: $("vietnamese").value.trim(),
    pronunciation: $("pronunciation").value.trim(),
    word_type: $("wordType").value.trim(),
    example: $("example").value.trim()
  };

  if (!row.english || !row.vietnamese) {
    showWordMessage(
      "Cần nhập tiếng Anh và nghĩa tiếng Việt.",
      true
    );
    return;
  }

  const { error } = await db
    .from("vocabulary")
    .insert(row);

  if (error) {
    showWordMessage(error.message, true);
    return;
  }

  event.target.reset();
  showWordMessage("Đã thêm từ thành công!");

  await loadTests();
};

// ==============================
// NHẬP HÀNG LOẠT
// ==============================

$("bulkAdd").onclick = async () => {
  if (!wordTest.value) {
    showWordMessage("Hãy chọn Test trước.", true);
    return;
  }

  const lines = $("bulkWords").value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    showWordMessage(
      "Chưa nhập danh sách từ.",
      true
    );
    return;
  }

  if (lines.length > 200) {
    showWordMessage(
      "Mỗi lần nhập tối đa 200 từ.",
      true
    );
    return;
  }

  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    const fields = lines[i]
      .split("|")
      .map(value => value.trim());

    if (
      fields.length < 2 ||
      fields.length > 3 ||
      !fields[0] ||
      !fields[1]
    ) {
      showWordMessage(
        `Dòng ${i + 1} sai định dạng.`,
        true
      );
      return;
    }

    rows.push({
      test_id: Number(wordTest.value),
      english: fields[0],
      vietnamese: fields[1],
      pronunciation: fields[2] || ""
    });
  }

  const { error } = await db
    .from("vocabulary")
    .insert(rows);

  if (error) {
    showWordMessage(error.message, true);
    return;
  }

  $("bulkWords").value = "";

  showWordMessage(
    `Đã thêm ${rows.length} từ thành công!`
  );

  await loadTests();
};

// ==============================
// XÓA TOÀN BỘ TỪ CỦA TEST
// ==============================

$("deleteAllWords").onclick = async () => {
  const button = $("deleteAllWords");
  const selectedId = Number(wordTest.value);

  if (!selectedId || button.disabled) {
    showWordMessage(
      "Hãy chọn Test trước.",
      true
    );
    return;
  }

  const testName =
    wordTest.selectedOptions[0]?.textContent ||
    "Test";

  const { count, error: countError } = await db
    .from("vocabulary")
    .select("id", {
      count: "exact",
      head: true
    })
    .eq("test_id", selectedId);

  if (countError) {
    showWordMessage(countError.message, true);
    return;
  }

  if (!count) {
    showWordMessage(
      "Test này chưa có từ vựng."
    );
    return;
  }

  if (!confirm(
    `Xóa toàn bộ ${count} từ của ${testName}?\n` +
    "Không thể hoàn tác!"
  )) return;

  const typed = prompt(
    "Nhập XOA để xác nhận:"
  );

  if (typed !== "XOA") {
    showWordMessage("Đã hủy xóa.");
    return;
  }

  button.disabled = true;

  try {
    const { error } = await db
      .from("vocabulary")
      .delete()
      .eq("test_id", selectedId);

    if (error) {
      showWordMessage(error.message, true);
      return;
    }

    const { count: remaining, error: verifyError } =
      await db
        .from("vocabulary")
        .select("id", {
          count: "exact",
          head: true
        })
        .eq("test_id", selectedId);

    if (verifyError) {
      showWordMessage(verifyError.message, true);
      return;
    }

    if (remaining > 0) {
      showWordMessage(
        `Vẫn còn ${remaining} từ. Hãy kiểm tra RLS.`,
        true
      );
      return;
    }

    showWordMessage(
      `Đã xóa toàn bộ ${count} từ của ${testName}.`
    );

    await loadTests();
  } catch (error) {
    showWordMessage(error.message, true);
  } finally {
    button.disabled = false;
  }
};

// ==============================
// KHỞI ĐỘNG
// ==============================

// THU GỌN TOÀN BỘ DANH SÁCH TEST
function setupAllTestsToggle() {
  const button = document.getElementById("toggleAllTests");
  const list = document.getElementById("testList");

  if (!button || !list) return;

  // Mặc định ẩn khi mở trang
  list.hidden = true;
  list.style.setProperty("display", "none", "important");

  button.addEventListener("click", () => {
    const isClosed = list.hidden;

    list.hidden = !isClosed;

    list.style.setProperty(
      "display",
      isClosed ? "block" : "none",
      "important"
    );

    button.textContent = isClosed
      ? "📚 Danh sách Test ▲"
      : "📚 Danh sách Test ▼";

    button.setAttribute(
      "aria-expanded",
      String(isClosed)
    );
  });
}

setupAllTestsToggle();
init();

init();
