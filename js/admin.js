const db = window.supabase.createClient(
      window.TOEIC_CONFIG.SUPABASE_URL,
      window.TOEIC_CONFIG.SUPABASE_ANON_KEY
    );

    async function init() {
      const { data: { user } } = await db.auth.getUser();
      if (!user) {
        location.href = "login.html";
        return;
      }

      const { data: profile, error } = await db
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || profile?.role !== "admin") {
        document.body.textContent = "Bạn không có quyền Admin.";
        return;
      }

      document.getElementById("adminPage").hidden = false;
      await loadTests();
      await loadWordTests();
    }

    async function loadTests() {
      const list = document.getElementById("testList");
      const { data, error } = await db
        .from("tests")
        .select("id,title,description")
        .order("title");

      if (error) {
        list.textContent = error.message;
        return;
      }

      list.replaceChildren();

      if (!data.length) {
        list.textContent = "Chưa có Test nào.";
        return;
      }

      data.forEach(test => {
        const item = document.createElement("div");
        item.className = "test";

        const name = document.createElement("h3");
        name.textContent = test.title;

        const desc = document.createElement("p");
        desc.textContent = test.description || "Chưa có mô tả";

        const edit = document.createElement("button");
        edit.textContent = "Sửa";
        edit.onclick = () => editTest(test);

        const del = document.createElement("button");
        del.textContent = "Xóa";
        del.className = "danger";
        del.onclick = () => deleteTest(test);

        item.append(name, desc, edit, del);
        list.append(item);
      });
    }

    document.getElementById("testForm").onsubmit = async e => {
      e.preventDefault();

      const title = document.getElementById("title").value.trim();
      const description = document.getElementById("description").value.trim();

      const { error } = await db.from("tests").insert({
        title,
        description,
        is_active: true
      });

      document.getElementById("message").textContent =
        error ? error.message : "Thêm Test thành công!";

      if (!error) {
        e.target.reset();
        loadTests();
        loadWordTests();
      }
    };

    async function editTest(test) {
      const title = prompt("Tên Test mới:", test.title);
      if (title === null || !title.trim()) return;

      const description = prompt("Mô tả:", test.description || "");
      if (description === null) return;

      const { error } = await db.from("tests")
        .update({ title: title.trim(), description })
        .eq("id", test.id);

      if (error) alert(error.message);
      else { loadTests(); loadWordTests(); }
    }

    async function deleteTest(test) {
      if (!confirm("Xóa " + test.title + " và dữ liệu liên quan?")) return;

      const { error } = await db.from("tests")
        .delete()
        .eq("id", test.id);

      if (error) alert(error.message);
      else { loadTests(); loadWordTests(); }
    }

    const wordTest = document.getElementById("wordTest");
    const wordMessage = document.getElementById("wordMessage");
    function showWordMessage(text, error=false) {
      wordMessage.textContent = text;
      wordMessage.style.color = error ? "#b42318" : "#176c40";
    }
    async function loadWordTests() {
      const previous = wordTest.value;
      const { data, error } = await db.from("tests").select("id,title").order("id");
      if (error) return showWordMessage(error.message, true);
      wordTest.replaceChildren();
      for (const test of data) {
        const option = new Option(test.title, String(test.id));
        wordTest.add(option);
      }
      if (data.some(t => String(t.id) === previous)) wordTest.value = previous;
      await loadWords();
    }
    async function loadWords() {
      const list = document.getElementById("wordList");
      list.replaceChildren();
      if (!wordTest.value) { list.textContent = "Chưa có Test."; return; }
      const { data, error } = await db.from("vocabulary")
        .select("id,english,vietnamese,pronunciation,word_type,example")
        .eq("test_id", Number(wordTest.value)).order("id").limit(1000);
      if (error) { list.textContent = error.message; return; }
      if (!data.length) { list.textContent = "Test này chưa có từ vựng."; return; }
      for (const word of data) {
        const item = document.createElement("div"); item.className = "test";
        const name = document.createElement("strong");
        name.textContent = word.english + " — " + word.vietnamese;
        const info = document.createElement("p");
        info.textContent = [word.pronunciation, word.word_type, word.example].filter(Boolean).join(" · ");
        const speak = document.createElement("button"); speak.textContent = "🔊 Nghe";
        speak.onclick = () => { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(word.english); u.lang = "en-US"; speechSynthesis.speak(u); };
        const edit = document.createElement("button"); edit.textContent = "Sửa";
        edit.onclick = async () => {
          const english = prompt("Tiếng Anh:", word.english);
          if (english === null || !english.trim()) return;
          const vietnamese = prompt("Nghĩa tiếng Việt:", word.vietnamese);
          if (vietnamese === null || !vietnamese.trim()) return;
          const pronunciation = prompt("Phiên âm:", word.pronunciation || "");
          if (pronunciation === null) return;
          const word_type = prompt("Từ loại:", word.word_type || "");
          if (word_type === null) return;
          const example = prompt("Ví dụ:", word.example || "");
          if (example === null) return;
          const { error } = await db.from("vocabulary").update({english:english.trim(),vietnamese:vietnamese.trim(),pronunciation,word_type,example}).eq("id",word.id);
          if (error) showWordMessage(error.message,true); else { showWordMessage("Đã sửa từ."); loadWords(); }
        };
        const del = document.createElement("button"); del.textContent = "Xóa"; del.className = "danger";
        del.onclick = async () => {
          if (!confirm("Xóa từ " + word.english + "?")) return;
          const { error } = await db.from("vocabulary").delete().eq("id",word.id);
          if (error) showWordMessage(error.message,true); else { showWordMessage("Đã xóa từ."); loadWords(); }
        };
        item.append(name,info,speak,edit,del); list.append(item);
      }
      if (data.length === 1000) showWordMessage("Đang hiển thị 1000 từ đầu tiên.");
    }
    document.getElementById("deleteAllWords").onclick = async () => {
      const button = document.getElementById("deleteAllWords");
      const selectedId = Number(wordTest.value);
      const selectedTitle = wordTest.selectedOptions[0]?.textContent || "Test";
      if (!selectedId || button.disabled) return showWordMessage("Hãy chọn Test trước.", true);

      const { count, error: countError } = await db.from("vocabulary")
        .select("id", { count: "exact", head: true }).eq("test_id", selectedId);
      if (countError) return showWordMessage("Không đếm được từ: " + countError.message, true);
      if (!count) return showWordMessage(selectedTitle + " chưa có từ vựng để xóa.");

      if (!confirm(`Bạn sắp XÓA ${count} từ vựng trong ${selectedTitle}.\nHành động này không thể hoàn tác. Tiếp tục?`)) return;
      const typed = prompt(`Để xác nhận xóa ${count} từ của ${selectedTitle}, nhập chính xác: XOA`);
      if (typed !== "XOA") return showWordMessage("Đã hủy xóa.");

      button.disabled = true;
      showWordMessage(`Đang xóa ${count} từ của ${selectedTitle}...`);
      try {
        // Lọc theo test_id, tránh ảnh hưởng đến các Test khác.
        const { error: deleteError } = await db.from("vocabulary")
          .delete().eq("test_id", selectedId);
        if (deleteError) return showWordMessage("Xóa thất bại: " + deleteError.message, true);
        const { count: remaining, error: verifyError } = await db.from("vocabulary")
          .select("id", { count: "exact", head: true }).eq("test_id", selectedId);
        if (verifyError) return showWordMessage("Đã gửi lệnh xóa nhưng chưa kiểm tra được: " + verifyError.message, true);
        if (remaining) return showWordMessage(`Vẫn còn ${remaining} từ trong ${selectedTitle}. Hãy kiểm tra quyền xóa (RLS) trong Supabase.`, true);
        showWordMessage(`Đã xóa toàn bộ ${count} từ trong ${selectedTitle}.`);
        if (Number(wordTest.value) === selectedId) await loadWords();
      } finally {
        button.disabled = false;
      }
    };

    wordTest.onchange = loadWords;
    document.getElementById("wordForm").onsubmit = async e => {
      e.preventDefault();
      if (!wordTest.value) return showWordMessage("Hãy tạo và chọn Test trước.",true);
      const row = {
        test_id:Number(wordTest.value), english:document.getElementById("english").value.trim(),
        vietnamese:document.getElementById("vietnamese").value.trim(),
        pronunciation:document.getElementById("pronunciation").value.trim(),
        word_type:document.getElementById("wordType").value.trim(),
        example:document.getElementById("example").value.trim()
      };
      if (!row.english || !row.vietnamese) return showWordMessage("Cần nhập tiếng Anh và nghĩa.",true);
      const { error } = await db.from("vocabulary").insert(row);
      if (error) showWordMessage(error.message,true);
      else { e.target.reset(); showWordMessage("Đã thêm từ!"); await loadWords(); }
    };
    document.getElementById("bulkAdd").onclick = async () => {
      if (!wordTest.value) return showWordMessage("Hãy chọn Test trước.",true);
      const lines = document.getElementById("bulkWords").value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      if (!lines.length) return showWordMessage("Chưa nhập danh sách từ.",true);
      if (lines.length > 200) return showWordMessage("Mỗi lần chỉ nhập tối đa 200 từ.",true);
      const rows = [];
      for (let i=0;i<lines.length;i++) {
        const fields = lines[i].split("|").map(s=>s.trim());
        if (fields.length < 2 || fields.length > 3 || !fields[0] || !fields[1])
          return showWordMessage("Dòng " + (i+1) + " sai định dạng. Dùng: english | nghĩa | phiên âm",true);
        rows.push({test_id:Number(wordTest.value),english:fields[0],vietnamese:fields[1],pronunciation:fields[2]||""});
      }
      const { error } = await db.from("vocabulary").insert(rows);
      if (error) showWordMessage(error.message,true);
      else { document.getElementById("bulkWords").value=""; showWordMessage("Đã thêm " + rows.length + " từ!"); await loadWords(); }
    };
    init();
