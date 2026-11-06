
/*
 * TOEIC TSD - Import Excel
 * Hỗ trợ:
 * - STT | Từ | Phiên âm | Nghĩa
 * - Hai nhóm 4 cột đặt cạnh nhau
 * - Excel 3 cột: Từ | Phiên âm | Nghĩa
 */

(() => {
  "use strict";

  const $excel = id => document.getElementById(id);

  const fileInput = $excel("excelFile");
  const previewButton = $excel("previewExcel");
  const importButton = $excel("importExcel");
  const status = $excel("excelStatus");
  const preview = $excel("excelPreview");
  const count = $excel("excelCount");
  const tableBox = $excel("excelPreviewTable");
  const testSelect = $excel("wordTest");

  if (
    !fileInput ||
    !previewButton ||
    !importButton ||
    !testSelect
  ) {
    console.error("Thiếu phần tử giao diện nhập Excel.");
    return;
  }

  let parsedWords = [];
  let previewTestId = null;

  function notify(message, error = false) {
    status.textContent = message;
    status.style.color = error ? "#dc3545" : "#16a34a";
  }

  function cell(value) {
    return String(value ?? "").trim();
  }

  function isNumber(value) {
    return /^\d+$/.test(cell(value));
  }

  function isHeader(value) {
    const text = cell(value).toLowerCase();

    return [
      "stt", "từ", "từ vựng",
      "english", "word", "phiên âm",
      "pronunciation", "nghĩa",
      "nghĩa tiếng việt", "vietnamese"
    ].includes(text);
  }

  function parseExcel(rows) {
    const result = [];

    for (const row of rows) {
      if (!Array.isArray(row)) continue;

      // File WHEN: mỗi nhóm gồm 4 cột
      // STT | Từ | Phiên âm | Nghĩa
      const hasTwoGroups = row.length >= 8;

      if (hasTwoGroups) {
        for (const start of [0, 4]) {
          const stt = cell(row[start]);
          const english = cell(row[start + 1]);
          const pronunciation = cell(row[start + 2]);
          const vietnamese = cell(row[start + 3]);

          if (
            !isNumber(stt) ||
            !english ||
            !vietnamese
          ) continue;

          result.push({
            english,
            pronunciation,
            vietnamese
          });
        }

        continue;
      }

      // Một nhóm 4 cột
      if (row.length >= 4 && isNumber(row[0])) {
        const english = cell(row[1]);
        const pronunciation = cell(row[2]);
        const vietnamese = cell(row[3]);

        if (english && vietnamese) {
          result.push({
            english,
            pronunciation,
            vietnamese
          });
        }

        continue;
      }

      // Excel 3 cột:
      // Tiếng Anh | Phiên âm | Nghĩa
      if (row.length >= 3) {
        const english = cell(row[0]);
        const pronunciation = cell(row[1]);
        const vietnamese = cell(row[2]);

        if (
          !english ||
          !vietnamese ||
          isHeader(english) ||
          isNumber(english)
        ) continue;

        result.push({
          english,
          pronunciation,
          vietnamese
        });
      }
    }

    return result;
  }

  function renderPreview(words) {
    tableBox.replaceChildren();

    const table = document.createElement("table");

    table.style.width = "100%";
    table.style.borderCollapse = "collapse";

    const thead = document.createElement("thead");
    const heading = document.createElement("tr");

    for (const title of [
      "STT", "Tiếng Anh", "Phiên âm", "Nghĩa"
    ]) {
      const th = document.createElement("th");
      th.textContent = title;
      th.style.padding = "8px";
      th.style.borderBottom = "1px solid #ccc";
      heading.appendChild(th);
    }

    thead.appendChild(heading);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    words.forEach((word, index) => {
      const tr = document.createElement("tr");

      const values = [
        index + 1,
        word.english,
        word.pronunciation,
        word.vietnamese
      ];

      for (const value of values) {
        const td = document.createElement("td");

        td.textContent = value;
        td.style.padding = "8px";
        td.style.borderBottom = "1px solid #ddd";

        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableBox.appendChild(table);
  }

  function resetPreview() {
    parsedWords = [];
    previewTestId = null;
    preview.hidden = true;
    count.textContent = "";
    tableBox.replaceChildren();
  }

  fileInput.addEventListener("change", resetPreview);
  testSelect.addEventListener("change", resetPreview);

  // ĐỌC FILE EXCEL
  previewButton.addEventListener("click", async () => {
    resetPreview();

    const file = fileInput.files[0];

    if (!file) {
      notify("Hãy chọn file Excel trước.", true);
      return;
    }

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      notify("Chỉ hỗ trợ file .xlsx hoặc .xls.", true);
      return;
    }

    if (!testSelect.value) {
      notify("Hãy chọn Test trước.", true);
      return;
    }

    if (!window.XLSX) {
      notify("Không tải được thư viện đọc Excel.", true);
      return;
    }

    previewButton.disabled = true;
    notify("Đang đọc file Excel...");

    try {
      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array"
      });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error("File Excel không có Sheet.");
      }

      const sheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        blankrows: false
      });

      parsedWords = parseExcel(rows);

      if (!parsedWords.length) {
        notify(
          "Không tìm thấy từ vựng. Kiểm tra cấu trúc cột Excel.",
          true
        );
        return;
      }

      previewTestId = testSelect.value;

      count.textContent =
        `Đã đọc ${parsedWords.length} từ. ` +
        "Kiểm tra trước khi nhập.";

      renderPreview(parsedWords);

      preview.hidden = false;

      notify(
        `Đọc thành công ${parsedWords.length} từ!`
      );

    } catch (error) {
      resetPreview();
      notify("Lỗi đọc Excel: " + error.message, true);
    } finally {
      previewButton.disabled = false;
    }
  });

  // NHẬP VÀO SUPABASE
  importButton.addEventListener("click", async () => {
    if (!parsedWords.length || !previewTestId) {
      notify("Hãy đọc file Excel trước.", true);
      return;
    }

    if (testSelect.value !== previewTestId) {
      resetPreview();
      notify("Test đã thay đổi. Hãy đọc lại file.", true);
      return;
    }

    // db được tạo sẵn trong admin.js
    if (typeof db === "undefined") {
      notify("Không tìm thấy kết nối Supabase.", true);
      return;
    }

    const testId = Number(previewTestId);

    if (!Number.isInteger(testId) || testId <= 0) {
      notify("ID Test không hợp lệ.", true);
      return;
    }

    const testName =
      testSelect.selectedOptions[0]?.textContent || "Test";

    if (!confirm(
      `Nhập ${parsedWords.length} từ vào "${testName}"?`
    )) return;

    importButton.disabled = true;
    previewButton.disabled = true;

    try {
      notify("Đang kiểm tra từ đã có...");

      // Đọc từ hiện có trong Test, phân trang
      const existing = new Set();
      const pageSize = 1000;

      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await db
          .from("vocabulary")
          .select("english")
          .eq("test_id", testId)
          .order("id")
          .range(offset, offset + pageSize - 1);

        if (error) throw error;

        for (const item of data || []) {
          existing.add(
            cell(item.english).toLowerCase()
          );
        }

        if (!data || data.length < pageSize) break;
      }

      const toInsert = [];
      const seen = new Set();
      let skipped = 0;

      for (const word of parsedWords) {
        const key = word.english.toLowerCase();

        if (existing.has(key) || seen.has(key)) {
          skipped++;
          continue;
        }

        seen.add(key);

        toInsert.push({
          test_id: testId,
          english: word.english,
          vietnamese: word.vietnamese,
          pronunciation: word.pronunciation,
          word_type: "",
          example: ""
        });
      }

      if (!toInsert.length) {
        notify(
          `Không có từ mới. Đã bỏ qua ${skipped} từ trùng.`
        );
        return;
      }

      let inserted = 0;
      const batchSize = 100;

      for (
        let start = 0;
        start < toInsert.length;
        start += batchSize
      ) {
        const batch = toInsert.slice(
          start,
          start + batchSize
        );

        const { error } = await db
          .from("vocabulary")
          .insert(batch);

        if (error) throw error;

        inserted += batch.length;

        notify(
          `Đang nhập ${inserted}/${toInsert.length} từ...`
        );
      }

      notify(
        `Thành công! Đã thêm ${inserted} từ. ` +
        `Bỏ qua ${skipped} từ trùng.`
      );

      resetPreview();
      fileInput.value = "";

      // Làm mới danh sách Test
      if (typeof loadTests === "function") {
        await loadTests();
      }

    } catch (error) {
      notify(
        "Lỗi nhập dữ liệu: " + error.message +
        " (Có thể một số từ đã được thêm trước khi lỗi.)",
        true
      );
    } finally {
      importButton.disabled = false;
      previewButton.disabled = false;
    }
  });

})();
