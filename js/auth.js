// Phase 1: basic Supabase authentication.
const supabaseClient = window.supabase.createClient(
  window.TOEIC_CONFIG.SUPABASE_URL,
  window.TOEIC_CONFIG.SUPABASE_ANON_KEY
);

const message = (text, isError = false) => {
  const el = document.getElementById("message");
  el.textContent = text;
  el.className = isError ? "message error" : "message success";
};

async function registerUser(event) {
  event.preventDefault();
  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  if (password.length < 8) return message("Mật khẩu cần ít nhất 8 ký tự.", true);

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  if (error) return message(error.message, true);
  message("Đăng ký thành công. Nếu Supabase yêu cầu xác nhận email, hãy mở email để xác nhận trước khi đăng nhập.");
}

async function loginUser(event) {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return message(error.message, true);
  window.location.href = "dashboard.html";
}

async function logoutUser() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

async function requireLogin() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

async function loadProfile() {
  const user = await requireLogin();
  if (!user) return null;
  const { data, error } = await supabaseClient
    .from("profiles").select("full_name, role").eq("id", user.id).single();
  if (error) {
    message("Đã đăng nhập nhưng chưa đọc được hồ sơ: " + error.message, true);
    return null;
  }
  return { user, profile: data };
}
