const alertaGrande = document.getElementById("alertaGrande");
const litrosText = document.getElementById("litrosText");
const percent = document.getElementById("percent");
const statusText = document.getElementById("status");
const water = document.getElementById("water");

// ===== NOVO: GASTO HOJE =====
let menorNivelHoje = null;
let consumoHoje = 0;
const LIMIAR = 0.5;

// ===== NOVO: GRÁFICO =====
let grafico = null;

// --- CONFIG ---
const MODO_SIMULACAO = false;
const R_BASE = 58.0;
const R_TOPO = 75.5;
const H_UTIL = 76.0;

const AREA_UTIL = 49; 

let notificacao25Enviada = false;
let notificacao40Enviada = false;
let notificacao87Enviada = false;

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "monitor-caixa-agua-ff63a.firebaseapp.com",
  databaseURL: "https://monitor-caixa-agua-ff63a-default-rtdb.firebaseio.com",
  projectId: "monitor-caixa-agua-ff63a",
  storageBucket: "monitor-caixa-agua-ff63a.firebasestorage.app",
  messagingSenderId: "176234978770",
  appId: "1:176234978770:web:e193d8242f4f111abd3c0b"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let nivelDestino = 0;
let nivelAtualAnim = 0;

// ===== DATA HOJE =====
function getDataHoje() {
  const hoje = new Date();

  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

const dataHoje = getDataHoje();
let dataAtual = dataHoje;
let consumoRef = database.ref("consumo/" + dataHoje);

// ===== CARREGAR CONSUMO SALVO =====
consumoRef.once("value").then(snapshot => {
  if (snapshot.exists()) {
    const data = snapshot.val();
    consumoHoje = data.total || 0;
    menorNivelHoje = data.menorNivel || null;
    atualizarConsumoHoje(consumoHoje);
  }
});

// ===== ANIMAÇÃO =====
function animar() {
  nivelAtualAnim += (nivelDestino - nivelAtualAnim) * 0.1;
  if(water) water.style.height = (nivelAtualAnim * AREA_UTIL / 100) + "%";
  if(percent) percent.innerText = nivelAtualAnim.toFixed(1) + "%";
  requestAnimationFrame(animar);
}
requestAnimationFrame(animar);

// ===== INTERFACE =====
function atualizarInterface(nivel, litros) {
  nivelDestino = nivel;

  if (litros !== undefined && litrosText) {
      litrosText.innerText = Math.round(litros) + " L";
  }

  // ===== PROCESSA CONSUMO AQUI =====
  processarConsumo(litros);

  if (nivel <= 25) { 
    if(water) water.style.background = "linear-gradient(to top, #ff0000, #ff4d4d)";
    statusText.innerText = "MUITO CRÍTICO";
    alertaGrande.innerText = "🚨 PERIGO: CAIXA VAZIA!";
    alertaGrande.style.display = "block";

    if (!notificacao25Enviada) {
      enviarTelegram("🚨 Nível Muito Crítico! " + nivel.toFixed(1) + "%");
      avisarAlexa("caixamuitocritica"); 
      notificacao25Enviada = true;
      notificacao40Enviada = false;
    }
  } 
  else if (nivel <= 40) { 
    if(water) water.style.background = "linear-gradient(to top, #ff7b00, #ffc107)";
    statusText.innerText = "LIGAR BOMBA";
    alertaGrande.innerText = "⚠ ABAIXO DE 40%";
    alertaGrande.style.display = "block";

    if (!notificacao40Enviada) {
      enviarTelegram("⚠ Ligue a bomba!");
      avisarAlexa("ligarbomba"); 
      notificacao40Enviada = true;
      notificacao25Enviada = false;
      notificacao87Enviada = false;
    }
  } 
  else if (nivel >= 87) { 
    if(water) water.style.background = "linear-gradient(to top, #0077ff, #00c6ff)";
    statusText.innerText = "Caixa Cheia";
    alertaGrande.innerText = "⛔ DESLIGAR BOMBA";
    alertaGrande.style.display = "block";

    if (!notificacao87Enviada) {
      enviarTelegram("🔔 Caixa cheia!");
      avisarAlexa("caixacheia"); 
      notificacao87Enviada = true;
      notificacao40Enviada = false;
    }
  } 
  else {
    if(water) water.style.background = "linear-gradient(to top, #0077ff, #00c6ff)";
    statusText.innerText = "Normal";
    alertaGrande.style.display = "none";

    if (nivel > 45 && nivel < 80) {
        notificacao25Enviada = false;
        notificacao40Enviada = false;
        notificacao87Enviada = false;
    }
  }
}

// ===== CONSUMO INTELIGENTE =====
function processarConsumo(litrosAtual) {
  if (litrosAtual === undefined || litrosAtual === null) return;

  if (menorNivelHoje === null) {
    menorNivelHoje = litrosAtual;
    return;
  }

  if (litrosAtual < (menorNivelHoje - LIMIAR)) {

    const diferenca = menorNivelHoje - litrosAtual;

    consumoHoje += diferenca;
    menorNivelHoje = litrosAtual;

    atualizarConsumoHoje(consumoHoje);

    consumoRef.set({
      total: parseFloat(consumoHoje.toFixed(2)),
      menorNivel: menorNivelHoje,
      ultimaAtualizacao: Date.now()
    });
  }
}

// ===== ATUALIZA UI =====
function atualizarConsumoHoje(valor) {
  const el = document.getElementById("gastoHoje");
  if (el) el.innerText = valor.toFixed(1) + " L";
}

// ===== GRÁFICO =====
function iniciarGrafico() {
  const ctx = document.getElementById("graficoConsumo")?.getContext("2d");
  if (!ctx) return;

  grafico = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Litros por dia",
        data: [],
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      animation: false
    }
  });
}

function escutarGraficoTempoReal() {
  database.ref("consumo").on("value", snapshot => {
    const dados = snapshot.val();
    if (!dados || !grafico) return;

    const datas = [];
    const valores = [];

    Object.keys(dados).sort().forEach(d => {
      datas.push(d.split("-").reverse().join("/"));
      valores.push(dados[d].total || 0);
    });

    grafico.data.labels = datas;
    grafico.data.datasets[0].data = valores;
    grafico.update();
  });
}

// ===== FIREBASE TEMPO REAL =====
if (!MODO_SIMULACAO) {
    database.ref('/').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.nivel !== undefined) {
            atualizarInterface(parseFloat(data.nivel), parseFloat(data.litros));
        }
    });
}

// ===== INICIAR GRÁFICO =====
iniciarGrafico();
escutarGraficoTempoReal();

// ===== APIs =====
function enviarTelegram(msg) {
  fetch(`https://api.telegram.org/botSEU_TOKEN/sendMessage?chat_id=SEU_CHAT&text=${encodeURIComponent(msg)}`);
}

function avisarAlexa(monkeyDevice) {
  fetch(`https://api-v2.voicemonkey.io/trigger?token=SEU_TOKEN&device=${monkeyDevice}&monkey=${monkeyDevice}`);
}

setInterval(() => {
  const novaData = getDataHoje();

  if (novaData !== dataAtual && document.visibilityState === "visible") {
    console.log("🔄 Novo dia detectado!");

    dataAtual = novaData;

    // 🧹 ZERA VARIÁVEIS
    menorNivelHoje = null;
    consumoHoje = 0;
    atualizarConsumoHoje(0);

    // 🔄 ATUALIZA FIREBASE
    consumoRef = database.ref("consumo/" + novaData);

    // 🔄 CARREGA DADOS DO NOVO DIA (se existir)
    consumoRef.once("value").then(snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();

        consumoHoje = data.total || 0;
        menorNivelHoje = data.menorNivel || null;

        atualizarConsumoHoje(consumoHoje);
      }
    });
  }
}, 60000); // verifica a cada 1 minuto
