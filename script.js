
// ---------- GLOBAL STATE ----------
let allAnime = [];
let filteredAnime = [];
let currentUser = null;
let mode = "login";
let dataLoaded = false;
let currentPage = 1;
let isLoading = false;

// ---------- AUTH STORAGE ----------
function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}
function getUsers() {
  return JSON.parse(localStorage.getItem("users")) || [];
}
function saveSession(user) {
  localStorage.setItem("session", JSON.stringify(user));
}
function getSession() {
  return JSON.parse(localStorage.getItem("session"));
}
function clearSession() {
  localStorage.removeItem("session");
}

// ---------- ELEMENTS ----------
const intro = document.getElementById("intro");
const welcome = document.getElementById("welcome");
const appHeader = document.getElementById("appHeader");
const appContent = document.getElementById("appContent");
const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const toggleAuth = document.getElementById("toggleAuth");
const enterBtn = document.getElementById("enterBtn");
const results = document.getElementById("results");
const emptyState = document.getElementById("emptyState");

// Header controls
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const randomBtn = document.getElementById("randomBtn");
const favoritesBtn = document.getElementById("favoritesBtn");
const allBtn = document.getElementById("allBtn");
const darkToggle = document.getElementById("darkToggle");
const logoutBtn = document.getElementById("logoutBtn");

// ---------- AUTH UI ----------
toggleAuth.addEventListener("click", (e) => {
  e.preventDefault();
  if (mode === "login") {
    mode = "signup";
    authTitle.textContent = "Sign Up";
    authForm.querySelector("button").textContent = "Sign Up";
    toggleAuth.innerHTML = `Already have an account? <a href="#" id="switchMode">Login</a>`;
  } else {
    mode = "login";
    authTitle.textContent = "Login";
    authForm.querySelector("button").textContent = "Login";
    toggleAuth.innerHTML = `Don't have an account? <a href="#" id="switchMode">Sign up</a>`;
  }
});

authForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  let users = getUsers();

  if (!username || !password) return;

  if (mode === "signup") {
    if (users.find(u => u.username === username)) {
      alert("Username already exists!");
      return;
    }
    users.push({ username, password, favorites: [] });
    saveUsers(users);
    alert("Account created! Please log in.");
    mode = "login";
    authTitle.textContent = "Login";
    authForm.querySelector("button").textContent = "Login";
  } else {
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      alert("Invalid username or password!");
      return;
    }
    currentUser = user;
    saveSession(user);
    intro.classList.add("hidden");
    welcome.classList.remove("hidden");
  }
});

// Auto-login
window.addEventListener("load", () => {
  const session = getSession();
  if (session) {
    currentUser = session;
    intro.classList.add("hidden");
    welcome.classList.remove("hidden");
  } else {
    intro.classList.remove("hidden");
  }
});

// ---------- DATA ----------
async function fetchAnimePage(page) {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/top/anime?limit=25&page=${page}`);
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    console.error("Failed to fetch anime", e);
    return [];
  }
}

async function ensureDataLoaded() {
  if (dataLoaded) return;
  const firstBatch = await fetchAnimePage(currentPage);
  allAnime = firstBatch;
  filteredAnime = allAnime.slice();
  dataLoaded = true;
}

// ---------- RENDER ----------
function renderAnime(animeList) {
  results.innerHTML = "";

  if (!animeList || !animeList.length) {
    emptyState.classList.remove("hidden");
    return;
  } else {
    emptyState.classList.add("hidden");
  }

  const users = getUsers();
  const me = users.find(u => u.username === currentUser?.username) || currentUser;
  const myFavs = me?.favorites || [];

  animeList.forEach(anime => {
    const isFav = myFavs.some(f => f.mal_id === anime.mal_id);

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${anime.images?.jpg?.image_url || ""}" alt="${anime.title}">
      <div class="card-body">
        <h3>${anime.title}</h3>
        <p>${anime.synopsis ? anime.synopsis.slice(0, 150) + "…" : "No description"}</p>
        <div class="card-footer">
          <span class="rating">⭐ ${anime.score ?? "N/A"}</span>
          <button class="fav-btn" data-id="${anime.mal_id}">${isFav ? "❤️" : "🤍"}</button>
        </div>
      </div>
    `;
    results.appendChild(card);
  });

  document.querySelectorAll(".fav-btn").forEach(btn => {
    btn.addEventListener("click", () => toggleFavorite(+btn.dataset.id));
  });
}

// ---------- SEARCH ----------
searchInput.addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  const list = allAnime.filter(a =>
    a.title?.toLowerCase().includes(q) ||
    a.genres?.some(g => g.name.toLowerCase().includes(q))
  );
  filteredAnime = list;
  renderAnime(filteredAnime);
});

// ---------- SORT ----------
sortSelect.addEventListener("change", (e) => {
  const v = e.target.value;
  const list = filteredAnime.length ? filteredAnime : allAnime.slice();

  if (v === "rating_desc") list.sort((a, b) => (b.score || 0) - (a.score || 0));
  if (v === "rating_asc") list.sort((a, b) => (a.score || 0) - (b.score || 0));
  if (v === "title_asc") list.sort((a, b) => a.title.localeCompare(b.title));

  renderAnime(list);
});

// ---------- RANDOM ----------
randomBtn.addEventListener("click", () => {
  const list = (filteredAnime.length ? filteredAnime : allAnime);
  if (!list.length) return;
  const pick = list[Math.floor(Math.random() * list.length)];
  renderAnime([pick]);
});

// ---------- FAVORITES ----------
function toggleFavorite(id) {
  if (!currentUser) return alert("Please log in first!");

  const anime = allAnime.find(a => a.mal_id === id);
  if (!anime) return;

  let users = getUsers();
  const idx = users.findIndex(u => u.username === currentUser.username);
  if (idx === -1) return;

  users[idx].favorites = users[idx].favorites || [];
  const exists = users[idx].favorites.some(f => f.mal_id === id);
  if (exists) {
    users[idx].favorites = users[idx].favorites.filter(f => f.mal_id !== id);
  } else {
    users[idx].favorites.push(anime);
  }

  saveUsers(users);
  currentUser = users[idx];
  saveSession(currentUser);

  renderAnime(filteredAnime.length ? filteredAnime : allAnime);
}

favoritesBtn.addEventListener("click", () => {
  if (!currentUser?.favorites?.length) {
    alert("No favorites yet!");
    return;
  }
  renderAnime(currentUser.favorites);
  favoritesBtn.classList.add("hidden");
  allBtn.classList.remove("hidden");
});

allBtn.addEventListener("click", () => {
  renderAnime(allAnime);
  allBtn.classList.add("hidden");
  favoritesBtn.classList.remove("hidden");
});

// ---------- FLOW: welcome -> app ----------
enterBtn.addEventListener("click", async () => {
  welcome.classList.add("hidden");
  appHeader.classList.remove("hidden");
  appContent.classList.remove("hidden");
  await ensureDataLoaded();
  renderAnime(allAnime);
});

// ---------- THEME + LOGOUT ----------
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

logoutBtn.addEventListener("click", () => {
  clearSession();
  currentUser = null;
  welcome.classList.add("hidden");
  appHeader.classList.add("hidden");
  appContent.classList.add("hidden");
  intro.classList.remove("hidden");
});

// ---------- INFINITE SCROLL ----------


window.addEventListener("scroll", async () => {
  if (isLoading || !currentUser) return;

  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
  if (nearBottom) {
    isLoading = true;
    currentPage++;
    const moreAnime = await fetchAnimePage(currentPage);
    if (moreAnime.length) {
      allAnime = allAnime.concat(moreAnime);
      filteredAnime = allAnime.slice(); // Update filtered list
      renderAnime(filteredAnime);
    }
    isLoading = false;
  }
});



