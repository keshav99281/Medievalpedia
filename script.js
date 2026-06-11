// ===== Data & State =====
let allData = {};
let allCards = [];
const categoryData = {};

async function loadData(file) {
  const response = await fetch(`data/${file}.json`);
  return response.json();
}

// ===== Color Utilities =====
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
}

function blendColors(colors) {
  if (!colors.length) return "#4b2e83";
  const rgb = colors.reduce((acc, hex) => {
    const c = hexToRgb(hex);
    return c ? {
      r: acc.r + c.r,
      g: acc.g + c.g,
      b: acc.b + c.b
    } : acc;
  }, { r: 0, g: 0, b: 0 });
  
  return rgbToHex(rgb.r / colors.length, rgb.g / colors.length, rgb.b / colors.length);
}

function calculateRaceColor(attributes) {
  const STR = Number(attributes?.strength) || 0;
  const STA = Number(attributes?.stamina) || 0;
  const MANA = Number(attributes?.mana) || 0;
  const AGI = Number(attributes?.agility) || 0;
  const HP = Number(attributes?.hp) || 0;
  const total = STR + STA + MANA + AGI + HP;
  if (total === 0) return "#4b2e83";

  const r = (STR * 255 + STA * 0 + MANA * 0 + AGI * 176 + HP * 255) / total;
  const g = (STR * 0 + STA * 200 + MANA * 145 + AGI * 0 + HP * 153) / total;
  const b = (STR * 0 + STA * 0 + MANA * 255 + AGI * 255 + HP * 0) / total;
  return rgbToHex(r, g, b);
}

function calculateImpactColor(impact) {
  const value = Math.max(0, Math.min(5, Number(impact) || 0));
  const map = {
    1: "#00C853",
    2: "#0091FF",
    3: "#B000FF",
    4: "#FF0066",
    5: "#FF9900"
  };
  return map[value] || "#4b2e83";
}

// ===== Dark Mode =====
const themeToggle = document.getElementById("theme-toggle");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const savedTheme = localStorage.getItem("theme") || (prefersDark ? "dark" : "light");

function initTheme() {
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.textContent = "☀️";
  }
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  themeToggle.textContent = isDark ? "☀️" : "🌙";
});

// ===== Side Navigation =====
const navToggle = document.querySelector(".nav-toggle");
const navClose = document.querySelector(".nav-close");
const sideNav = document.querySelector(".side-nav");
const navLinks = document.querySelectorAll(".nav-links a");

navToggle.addEventListener("click", () => {
  sideNav.classList.add("open");
});

navClose.addEventListener("click", () => {
  sideNav.classList.remove("open");
});

navLinks.forEach(link => {
  link.addEventListener("click", () => {
    sideNav.classList.remove("open");
  });
});

document.addEventListener("click", (e) => {
  if (!sideNav.contains(e.target) && !navToggle.contains(e.target)) {
    sideNav.classList.remove("open");
  }
});

// ===== Advanced Search with Relationships =====
const searchInput = document.getElementById("search-input");

function findRelatedData(searchTerm) {
  const term = searchTerm.toLowerCase().trim();
  const matches = {
    races: [],
    classes: [],
    elements: [],
    metals: [],
    skills: []
  };

  if (!term) return matches;

  // Find matching races
  allData.races?.forEach(race => {
    if (race.name.toLowerCase().includes(term) || race.description.toLowerCase().includes(term)) {
      matches.races.push(race);
      // Add recommended classes
      race.recommendedClasses?.forEach(className => {
        const cls = allData.classes?.find(c => c.name.toLowerCase() === className.toLowerCase());
        if (cls && !matches.classes.find(c => c.name === cls.name)) {
          matches.classes.push(cls);
          // Add compatible elements
          cls.compatibleElements?.forEach(elemName => {
            const elem = allData.elements?.find(e => e.name.toLowerCase() === elemName.toLowerCase());
            if (elem && !matches.elements.find(e => e.name === elem.name)) {
              matches.elements.push(elem);
              // Add compatible metals
              allData.metals?.forEach(metal => {
                if (metal.compatibleElements?.some(me => me.toLowerCase() === elemName.toLowerCase())) {
                  if (!matches.metals.find(m => m.name === metal.name)) {
                    matches.metals.push(metal);
                  }
                }
              });
            }
          });
        }
      });
    }
  });

  // Find matching classes
  allData.classes?.forEach(cls => {
    if ((cls.name.toLowerCase().includes(term) || cls.description.toLowerCase().includes(term)) &&
        !matches.classes.find(c => c.name === cls.name)) {
      matches.classes.push(cls);
      cls.compatibleElements?.forEach(elemName => {
        const elem = allData.elements?.find(e => e.name.toLowerCase() === elemName.toLowerCase());
        if (elem && !matches.elements.find(e => e.name === elem.name)) {
          matches.elements.push(elem);
        }
      });
    }
  });

  // Find matching elements
  allData.elements?.forEach(elem => {
    if ((elem.name.toLowerCase().includes(term) || elem.environment.toLowerCase().includes(term)) &&
        !matches.elements.find(e => e.name === elem.name)) {
      matches.elements.push(elem);
      allData.metals?.forEach(metal => {
        if (metal.compatibleElements?.some(me => me.toLowerCase() === elem.name.toLowerCase())) {
          if (!matches.metals.find(m => m.name === metal.name)) {
            matches.metals.push(metal);
          }
        }
      });
    }
  });

  // Find matching metals
  allData.metals?.forEach(metal => {
    if ((metal.name.toLowerCase().includes(term) || metal.description.toLowerCase().includes(term)) &&
        !matches.metals.find(m => m.name === metal.name)) {
      matches.metals.push(metal);
    }
  });

  // Find matching skills
  allData.skills?.forEach(skill => {
    if ((skill.name.toLowerCase().includes(term) || skill.description.toLowerCase().includes(term)) &&
        !matches.skills.find(s => s.name === skill.name)) {
      matches.skills.push(skill);
    }
  });

  return matches;
}

function performSearch(query) {
  const matches = findRelatedData(query);
  const allCategories = ['races', 'classes', 'elements', 'metals', 'skills'];
  const searchActive = query.trim().length > 0;

  allCategories.forEach(category => {
    const container = document.querySelector(`#${category} .content`);
    const categoryCards = matches[category];
    const toggleBtn = container.previousElementSibling.querySelector(".toggle");

    if (searchActive && categoryCards.length > 0) {
      container.classList.remove("hidden");
      toggleBtn.textContent = "−";
      toggleBtn.setAttribute("aria-expanded", "true");

      categoryData[category].forEach(card => {
        const cardName = card.querySelector("h3")?.textContent || card.querySelector("h4")?.textContent || "";
        const isMatch = categoryCards.some(item => item.name === cardName);
        card.style.display = isMatch ? "" : "none";
      });
    } else {
      categoryData[category].forEach(card => card.style.display = "");
      if (searchActive) {
        container.classList.add("hidden");
        toggleBtn.textContent = "+";
        toggleBtn.setAttribute("aria-expanded", "false");
      } else {
        container.classList.add("hidden");
        toggleBtn.textContent = "+";
        toggleBtn.setAttribute("aria-expanded", "false");
      }
    }
  });
}

searchInput.addEventListener("input", (e) => {
  performSearch(e.target.value);
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    performSearch(e.target.value);
  }
});

// ===== Random Entry =====
const randomBtn = document.getElementById("random-btn");

randomBtn.addEventListener("click", () => {
  const visibleCards = allCards.filter(card => {
    const isHiddenByStyle = card.style.display === "none";
    const isRendered = card.offsetParent !== null;
    return !isHiddenByStyle && isRendered;
  });
  if (visibleCards.length === 0) return;

  const randomCard = visibleCards[Math.floor(Math.random() * visibleCards.length)];
  const category = randomCard.dataset.category;
  if (category) {
    const container = document.querySelector(`#${category} .content`);
    const toggleBtn = container.previousElementSibling.querySelector(".toggle");
    container.classList.remove("hidden");
    toggleBtn.textContent = "−";
    toggleBtn.setAttribute("aria-expanded", "true");
  }

  randomCard.scrollIntoView({ behavior: "smooth", block: "center" });
  randomCard.style.animation = "none";
  setTimeout(() => {
    randomCard.style.animation = "pulse 0.6s ease";
  }, 10);
});

// ===== Category Toggle =====
function toggleCategory(button) {
  const content = button.parentElement.nextElementSibling;
  const isHidden = content.classList.toggle("hidden");
  button.textContent = isHidden ? "+" : "−";
  button.setAttribute("aria-expanded", String(!isHidden));
}

document.querySelectorAll(".toggle").forEach(btn => {
  btn.addEventListener("click", () => toggleCategory(btn));
});

// ===== Card Creation =====
function createCard(title, type, bodyHtml, borderColor = "#4b2e83", category = "") {
  const card = document.createElement("article");
  card.className = "card";
  if (category) card.dataset.category = category;
  card.style.borderColor = borderColor;
  card.innerHTML = `
    <h3>${title}</h3>
    <div class="card-type">${type}</div>
    ${bodyHtml}
  `;
  allCards.push(card);
  return card;
}

function createBadgeList(items) {
  if (!Array.isArray(items) || !items.length) return "";
  return `<div class="badge-list">${items.map(item => `<span class="badge">${item}</span>`).join("")}</div>`;
}

function formatAttributes(attributes) {
  if (!attributes || !Object.keys(attributes).length) return "";
  return `
    <div class="attribute-grid">
      ${Object.entries(attributes).map(([key, value]) => `<span><b>${key}</b>: ${Number(value).toFixed(1)}</span>`).join("")}
    </div>
  `;
}

function renderCards(container, items, renderer, categoryName) {
  const row = document.createElement("div");
  row.className = "cards-row";
  const cards = [];
  items.forEach(item => {
    const card = renderer(item, categoryName);
    cards.push(card);
    row.appendChild(card);
  });
  container.appendChild(row);
  if (!categoryData[categoryName]) categoryData[categoryName] = [];
  categoryData[categoryName].push(...cards);
}

function renderList(container, items, renderer, categoryName) {
  const list = document.createElement("ul");
  list.className = "element-list";
  const items_ = [];
  items.forEach(item => {
    const li = renderer(item);
    items_.push(li);
    list.appendChild(li);
  });
  container.appendChild(list);
  if (!categoryData[categoryName]) categoryData[categoryName] = [];
  categoryData[categoryName].push(...items_);
}

// ===== Renderers =====
function createRaceCard(race) {
  const borderColor = calculateRaceColor(race.attributes);
  return createCard(race.name, "Race", `
    <p>${race.description}</p>
    <p><b>Strengths:</b> ${race.strengths?.join(", ") || "—"}</p>
    <p><b>Weaknesses:</b> ${race.weaknesses?.join(", ") || "—"}</p>
    ${formatAttributes(race.attributes)}
    <p><b>Recommended Classes:</b></p>
    ${createBadgeList(race.recommendedClasses)}
  `, borderColor, "races");
}

function createClassCard(cls) {
  const elementColors = cls.compatibleElements?.map(elem => allData.elements?.find(e => e.name === elem)?.color).filter(Boolean) || [];
  const borderColor = elementColors.length ? blendColors(elementColors) : "#4b2e83";
  return createCard(cls.name, "Class", `
    <p>${cls.description}</p>
    <p><b>Compatible Equipment:</b></p>
    ${createBadgeList(cls.compatibleEquipment)}
    <p><b>Compatible Elements:</b></p>
    ${createBadgeList(cls.compatibleElements)}
  `, borderColor, "classes");
}

function createMetalCard(metal) {
  const elementColors = metal.compatibleElements?.map(elem => allData.elements?.find(e => e.name === elem)?.color).filter(Boolean) || [];
  const borderColor = elementColors.length ? blendColors(elementColors) : "#4b2e83";
  return createCard(metal.name, "Metal", `
    <p>${metal.description}</p>
    <p><b>Origin:</b> ${metal.origin}</p>
    <p><b>Compatible Elements:</b></p>
    ${createBadgeList(metal.compatibleElements)}
  `, borderColor, "metals");
}

function createSkillCard(skill) {
  const value = Math.max(0, Math.min(5, Number(skill.impact) || 0));
  const stars = "★".repeat(value) + "☆".repeat(5 - value);
  const borderColor = calculateImpactColor(value);
  return createCard(skill.name, "Skill", `
    <p>${skill.description}</p>
    <p><b>Impact:</b> ${stars}</p>
  `, borderColor, "skills");
}

function createElementItem(element) {
  const item = document.createElement("li");
  item.className = "element-item";
  item.dataset.category = "elements";
  item.style.borderColor = element.color;
  item.innerHTML = `
    <span class="sphere" style="background-color: ${element.color};"></span>
    <div>
      <h4>${element.name}</h4>
      <p><b>Environment:</b> ${element.environment}</p>
    </div>
  `;
  allCards.push(item);
  return item;
}

// ===== Data Loading =====
async function initializeApp() {
  await Promise.all([
    loadData("races").then(races => {
      allData.races = races;
      categoryData.races = [];
      const container = document.querySelector("#races .content");
      renderCards(container, races, createRaceCard, "races");
    }),
    loadData("classes").then(classes => {
      allData.classes = classes;
      categoryData.classes = [];
      const container = document.querySelector("#classes .content");
      renderCards(container, classes, createClassCard, "classes");
    }),
    loadData("elements").then(elements => {
      allData.elements = elements;
      categoryData.elements = [];
      const container = document.querySelector("#elements .content");
      renderList(container, elements, createElementItem, "elements");
    }),
    loadData("metals").then(metals => {
      allData.metals = metals;
      categoryData.metals = [];
      const container = document.querySelector("#metals .content");
      renderCards(container, metals, createMetalCard, "metals");
    }),
    loadData("skills").then(skills => {
      allData.skills = skills;
      categoryData.skills = [];
      const container = document.querySelector("#skills .content");
      renderCards(container, skills, createSkillCard, "skills");
    })
  ]);
}

// ===== Add pulse animation =====
const style = document.createElement("style");
style.textContent = `
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.04); }
  }
`;
document.head.appendChild(style);

// ===== Init =====
initTheme();
initializeApp();

