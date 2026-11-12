
/* TOEIC TSD - Learning Streak
   Timezone: Asia/Ho_Chi_Minh
*/

(() => {
  "use strict";

  const TIMEZONE = "Asia/Ho_Chi_Minh";

  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  // Chuyển thời gian sang ngày Việt Nam: YYYY-MM-DD
  function vietnamDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const parts = dateFormatter.formatToParts(date);

    const get = type =>
      parts.find(p => p.type === type)?.value;

    return `${get("year")}-${get("month")}-${get("day")}`;
  }

  // Cộng/trừ ngày bằng UTC để tránh lệch múi giờ
  function addDays(dateString, amount) {
    const [year, month, day] =
      dateString.split("-").map(Number);

    const date = new Date(
      Date.UTC(year, month - 1, day + amount)
    );

    return date.toISOString().slice(0, 10);
  }

  // Tính Streak từ danh sách ngày đã học
  function calculateStreak(dateList) {
    const dates = [...new Set(dateList)]
      .filter(Boolean)
      .sort();

    const studied = new Set(dates);
    const today = vietnamDate(new Date());
    const yesterday = addDays(today, -1);

    let current = 0;

    // Nếu hôm nay chưa học, cho phép giữ Streak của hôm qua
    let cursor = studied.has(today)
      ? today
      : yesterday;

    while (studied.has(cursor)) {
      current++;
      cursor = addDays(cursor, -1);
    }

    // Tính kỷ lục cao nhất
    let longest = 0;
    let run = 0;
    let previous = null;

    for (const day of dates) {
      if (
        previous &&
        addDays(previous, 1) === day
      ) {
        run++;
      } else {
        run = 1;
      }

      longest = Math.max(longest, run);
      previous = day;
    }

    return {
      current,
      longest,
      totalDays: dates.length,
      studied,
      today
    };
  }

  // Lấy toàn bộ ngày học của tài khoản hiện tại
  async function fetchStudyDates(userId) {
    const dates = new Set();

    // Phân trang để không bị giới hạn 1000 bản ghi
    for (let from = 0; ; from += 500) {
      const { data, error } = await supabaseClient
        .from("attempts")
        .select("created_at")
        .eq("user_id", userId)
        .order("created_at", {
          ascending: true
        })
        .range(from, from + 499);

      if (error) {
        throw new Error(error.message);
      }

      const rows = data || [];

      for (const row of rows) {
        const day = vietnamDate(row.created_at);

        if (day) {
          dates.add(day);
        }
      }

      if (rows.length < 500) {
        break;
      }
    }

    return [...dates];
  }

  // Tạo phần tử an toàn
  function element(tag, className, text) {
    const el = document.createElement(tag);

    if (className) {
      el.className = className;
    }

    if (text !== undefined) {
      el.textContent = text;
    }

    return el;
  }

  // Hiển thị giao diện Streak
  function renderStreak(container, stats) {
    container.replaceChildren();

    const heading = element(
      "div",
      "streak-heading"
    );

    const titleArea = element(
      "div",
      "streak-title-area"
    );

    titleArea.append(
      element(
        "div",
        "streak-eyebrow",
        "TOEIC TSD · LEARNING STREAK"
      )
    );

    const numberRow = element(
      "div",
      "streak-number-row"
    );

    numberRow.append(
      element(
        "span",
        "streak-fire",
        "🔥"
      ),
      element(
        "strong",
        "streak-number",
        `${stats.current} ngày`
      )
    );

    titleArea.append(numberRow);

    const message = stats.studied.has(stats.today)
      ? "Tuyệt vời! Hôm nay bạn đã học rồi."
      : stats.current > 0
        ? "Học một Test hôm nay để duy trì chuỗi!"
        : "Hoàn thành một Test để bắt đầu Streak!";

    titleArea.append(
      element(
        "p",
        "streak-message",
        message
      )
    );

    const record = element(
      "div",
      "streak-record"
    );

    record.append(
      element(
        "span",
        "streak-record-icon",
        "🏆"
      ),
      element(
        "span",
        "streak-record-label",
        "Kỷ lục"
      ),
      element(
        "strong",
        "streak-record-value",
        `${stats.longest} ngày`
      )
    );

    heading.append(titleArea, record);

    // Lịch học 7 ngày của tuần hiện tại
    const week = element(
      "div",
      "streak-week"
    );

    const [year, month, day] =
      stats.today.split("-").map(Number);

    const todayUTC = new Date(
      Date.UTC(year, month - 1, day)
    );

    // Thứ Hai = 0, Chủ nhật = 6
    const mondayOffset =
      (todayUTC.getUTCDay() + 6) % 7;

    const monday = addDays(
      stats.today,
      -mondayOffset
    );

    const labels = [
      "T2", "T3", "T4", "T5",
      "T6", "T7", "CN"
    ];

    for (let i = 0; i < 7; i++) {
      const date = addDays(monday, i);
      const completed = stats.studied.has(date);
      const isToday = date === stats.today;
      const isFuture = date > stats.today;

      const item = element(
        "div",
        "streak-day"
      );

      item.append(
        element(
          "span",
          "streak-day-label",
          labels[i]
        )
      );

      const circle = element(
        "div",
        "streak-day-circle"
      );

      if (completed) {
        circle.classList.add("completed");
        circle.textContent = "✓";
      } else if (isToday) {
        circle.classList.add("today");
        circle.textContent = "🔥";
      } else if (isFuture) {
        circle.classList.add("future");
        circle.textContent = "·";
      } else {
        circle.textContent = "–";
      }

      circle.title = `${date} ${
        completed ? "Đã học" : "Chưa học"
      }`;

      item.append(circle);
      week.append(item);
    }

    const footer = element(
      "div",
      "streak-footer"
    );

    footer.append(
      element(
        "span",
        "",
        `📚 Tổng số ngày đã học: ${stats.totalDays}`
      ),
      element(
        "span",
        "",
        "🇻🇳 Giờ Việt Nam"
      )
    );

    container.append(
      heading,
      week,
      footer
    );
  }

  // Hàm gọi từ Dashboard và Profile
  async function mount(userId) {
    const container =
      document.getElementById("toeicStreak");

    if (!container || !userId) {
      return;
    }

    container.textContent =
      "Đang tải chuỗi ngày học...";

    try {
      const dates = await fetchStudyDates(userId);
      const stats = calculateStreak(dates);

      renderStreak(container, stats);
    } catch (error) {
      console.error("Streak error:", error);

      container.textContent =
        "Không tải được Streak. " +
        "Vui lòng kiểm tra quyền đọc lịch sử học tập.";
    }
  }

  window.TOEIC_STREAK = {
    mount,
    calculateStreak
  };
})();

