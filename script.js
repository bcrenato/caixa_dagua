// ===== MODO FIXO PARA CALIBRAÇÃO =====

// Elementos
const water = document.getElementById("water");
const percent = document.getElementById("percent");
const statusText = document.getElementById("status");

// ===== NIVEL FIXO =====
const NIVEL_FIXO = 100; // altere aqui se quiser testar 80, 50, etc

// Define água parada
water.style.height = NIVEL_FIXO + "%";
percent.innerText = NIVEL_FIXO + "%";
statusText.innerText = "Calibração";

// Remove qualquer transição para não animar
water.style.transition = "none";
