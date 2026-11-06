
const db = window.supabase.createClient(
    window.TOEIC_CONFIG.SUPABASE_URL,
    window.TOEIC_CONFIG.SUPABASE_ANON_KEY
);

const $ = id => document.getElementById(id);

const wordTest = $("wordTest");
const wordMessage = $("wordMessage");

// Ghi nhớ Test đang mở
let openedTestId = null;

// ===== THÔNG BÁO =====

function showWordMessage(message, isError = false) {
    wordMessage.textContent = message;
    wordMessage.style.color = isError
        ? "#b42318"
        : "#176c40";
}

// ===== KIỂM TRA ADMIN =====

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
            "Bạn không có quyền Admin.";
        return;
    }

    $("adminPage").hidden = false;

    await loadTests();
    await loadWordTests();
}

// ===== DANH SÁCH TEST =====

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

    if (!data || data.length === 0) {
        list.textContent = "Chưa có Test nào.";
        return;
    }

    for (const test of data) {
        const item = document.createElement("div");
        item.className = "test";

        const header = document.createElement("div");
        header.className = "test-header";

        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "test-open";
        openButton.textContent = "📚 " + test.title + " ▼";

        const actions = document.createElement("div");

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "✏️ Sửa tên";
        editButton.onclick = () => editTest(test);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "danger";
        deleteButton.textContent = "🗑️ Xóa Test";
        deleteButton.onclick = () => deleteTest(test);

        actions.append(editButton, deleteButton);
        header.append(openButton, actions);

        const description = document.createElement("p");
        description.textContent =
            test.description || "Chưa có mô tả";

        const wordsBox = document.createElement("div");
        wordsBox.className = "test-words";
        wordsBox.hidden = true;

        // Bấm Test để mở hoặc đóng từ vựng
        openButton.onclick = async () => {
            if (!wordsBox.hidden) {
                wordsBox.hidden = true;
                openedTestId = null;
                openButton.textContent =
                    "📚 " + test.title + " ▼";
                return;
            }

            // Chỉ mở một Test tại một thời điểm
            document.querySelectorAll(".test-words")
                .forEach(box => {
                    box.hidden = true;
                });

            document.querySelectorAll(".test-open")
                .forEach(button => {
                    button.textContent =
                        "📚 " +
                        button.dataset.title +
                        " ▼";
                });

            openedTestId = String(test.id);

            wordsBox.hidden = false;
            openButton.textContent =
                "📚 " + test.title + " ▲";

            await loadTestWords(test.id, wordsBox);
        };

        openButton.dataset.title = test.title;

        item.append(header, description, wordsBox);
        list.append(item);

        // Giữ Test đang mở sau khi tải lại
        if (String(test.id) === openedTestId) {
            wordsBox.hidden = false;
            openButton.textContent =
                "📚 " + test.title + " ▲";

            await loadTestWords(test.id, wordsBox);
        }
    }
}

// ===== THÊM TEST =====

$("testForm").onsubmit = async event => {
    event.preventDefault();

    const title = $("title").value.trim();
    const description = $("description").value.trim();

    if (!title) return;

    const { error } = await db.from("tests").insert({
        title,
        description,
        is_active: true
    });

    $("message").textContent = error
        ? error.message
        : "Thêm Test thành công!";

    if (!error) {
        event.target.reset();
        await loadTests();
        await loadWordTests();
    }
};

// ===== SỬA TÊN TEST =====

async function editTest(test) {
    const title = prompt(
        "Tên Test mới:",
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
}

// ===== XÓA TEST =====

async function deleteTest(test) {
    const confirmed = confirm(
        "Xóa " + test.title +
        " và dữ liệu liên quan?\n" +
        "Hành động này không thể hoàn tác."
    );

    if (!confirmed) return;

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
}

// ===== TẢI TEST CHO FORM THÊM TỪ =====

async function loadWordTests() {
    const previous = wordTest.value;

    const { data, error } = await db
        .from("tests")
        .select("id,title")
        .order("id");

    if (error) {
        showWordMessage(error.message, true);
        return;
    }

    wordTest.replaceChildren();

    for (const test of data || []) {
        const option = new Option(
            test.title,
            String(test.id)
        );
        wordTest.add(option);
    }

    if (
        data.some(test =>
            String(test.id) === previous
        )
    ) {
        wordTest.value = previous;
    }
}

// ===== TẢI TỪ VỰNG TRONG TỪNG TEST =====

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

    if (!data || data.length === 0) {
        container.textContent =
            "Test này chưa có từ vựng.";
        return;
    }

    const count = document.createElement("p");
    count.textContent =
        "📖 Đang hiển thị " +
        data.length +
        " từ vựng";

    container.append(count);

    for (const word of data) {
        const item = document.createElement("div");
        item.className = "test";

        const name = document.createElement("strong");
        name.textContent =
            word.english + " — " + word.vietnamese;

        const info = document.createElement("p");
        info.textContent = [
            word.pronunciation,
            word.word_type,
            word.example
        ].filter(Boolean).join(" · ");

        const actions = document.createElement("div");
        actions.className = "word-actions";

        // Nghe phát âm
        const listen = document.createElement("button");
        listen.type = "button";
        listen.textContent = "🔊 Nghe";

        listen.onclick = () => {
            if (!("speechSynthesis" in window)) {
                alert("Trình duyệt không hỗ trợ phát âm.");
                return;
            }

            speechSynthesis.cancel();

            const utterance =
                new SpeechSynthesisUtterance(word.english);

            utterance.lang = "en-US";
            utterance.rate = 0.9;

            speechSynthesis.speak(utterance);
        };

        // Sửa từ vựng
        const edit = document.createElement("button");
        edit.type = "button";
        edit.textContent = "✏️ Sửa từ";

        edit.onclick = async () => {
            const english = prompt(
                "Tiếng Anh:",
                word.english
            );

            if (english === null || !english.trim()) {
                return;
            }

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
                alert("Sửa thất bại: " + error.message);
                return;
            }

            showWordMessage("Đã sửa từ vựng!");
            await loadTestWords(testId, container);
        };

        // Xóa từng từ
        const del = document.createElement("button");
        del.type = "button";
        del.className = "danger";
        del.textContent = "🗑️ Xóa từ";

        del.onclick = async () => {
            if (!confirm(
                "Xóa từ \"" + word.english + "\"?"
            )) {
                return;
            }

            const { error } = await db
                .from("vocabulary")
                .delete()
                .eq("id", word.id)
                .eq("test_id", testId);

            if (error) {
                alert("Xóa thất bại: " + error.message);
                return;
            }

            showWordMessage("Đã xóa từ vựng!");
            await loadTestWords(testId, container);
        };

        actions.append(listen, edit, del);
        item.append(name, info, actions);
        container.append(item);
    }

    if (data.length === 1000) {
        const note = document.createElement("p");
        note.textContent =
            "Đang hiển thị 1000 từ đầu tiên.";
        container.append(note);
    }
}

// ===== THÊM MỘT TỪ =====

$("wordForm").onsubmit = async event => {
    event.preventDefault();

    if (!wordTest.value) {
        showWordMessage(
            "Hãy tạo và chọn Test trước.",
            true
        );
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
            "Cần nhập tiếng Anh và nghĩa.",
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
    showWordMessage("Đã thêm từ!");

    await loadTests();
};

// ===== NHẬP NHIỀU TỪ =====

$("bulkAdd").onclick = async () => {
    if (!wordTest.value) {
        showWordMessage(
            "Hãy chọn Test trước.",
            true
        );
        return;
    }

    const lines = $("bulkWords")
        .value
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
            "Mỗi lần chỉ nhập tối đa 200 từ.",
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
                "Dòng " + (i + 1) +
                " sai định dạng. " +
                "Dùng: english | nghĩa | phiên âm",
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
        "Đã thêm " + rows.length + " từ!"
    );

    await loadTests();
};

// ===== XÓA TOÀN BỘ TỪ CỦA TEST =====

$("deleteAllWords").onclick = async () => {
    const button = $("deleteAllWords");
    const selectedId = Number(wordTest.value);

    const selectedTitle =
        wordTest.selectedOptions[0]?.textContent ||
        "Test";

    if (!selectedId || button.disabled) {
        showWordMessage(
            "Hãy chọn Test trước.",
            true
        );
        return;
    }

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
            selectedTitle + " chưa có từ vựng."
        );
        return;
    }

    const confirmed = confirm(
        `Bạn sắp XÓA ${count} từ trong ${selectedTitle}.\n` +
        "Không thể hoàn tác. Tiếp tục?"
    );

    if (!confirmed) return;

    const typed = prompt(
        "Nhập chính xác XOA để xác nhận:"
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

        const {
            count: remaining,
            error: verifyError
        } = await db
            .from("vocabulary")
            .select("id", {
                count: "exact",
                head: true
            })
            .eq("test_id", selectedId);

        if (verifyError) {
            showWordMessage(
                "Không kiểm tra được kết quả xóa: " +
                verifyError.message,
                true
            );
            return;
        }

        if (remaining > 0) {
            showWordMessage(
                `Vẫn còn ${remaining} từ. ` +
                "Hãy kiểm tra quyền RLS.",
                true
            );
            return;
        }

        showWordMessage(
            `Đã xóa toàn bộ ${count} từ trong ${selectedTitle}.`
        );

        await loadTests();
    } catch (error) {
        showWordMessage(error.message, true);
    } finally {
        button.disabled = false;
    }
};

// ===== KHỞI ĐỘNG =====

// File được tải bằng defer
init();
