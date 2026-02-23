const alertaGrande = document.getElementById("alertaGrande");
const litrosText = document.getElementById("litrosText");

// ===== CONFIGURAÇÃO =====
const MODO_SIMULACAO = true; // Mude para false para ler do sensor real
const AREA_UTIL = 49; 

// Medidas da Caixa para Cálculo Real (Tronco de Cone)
const R_BASE = 58.0;
const R_TOPO = 75.5;
const H_UTIL = 76.0;

// CONFIGURAÇÕES DO SEU FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCQipZjlc86GtZGx3_aoyCT-jDrZ1oYyYM",
  authDomain: "monitor-caixa-agua-ff63a.firebaseapp.com",
  databaseURL: "https://monitor-caixa-agua-ff63a-default-rtdb.firebaseio.com",
  projectId: "monitor-caixa-agua-ff63a",
  storageBucket: "monitor-caixa-agua-ff63a.firebasestorage.app",
  messagingSenderId: "176234978770",
  appId: "1:176234978770:web:e193d8242f4f111abd3c0b"
};

// Inicializa o Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// ===== ELEMENTOS =====
const water = document.getElementById("water");
const percent = document.getElementById("percent");
const statusText = document.getElementById("status");

// ===== CONTROLE DE NÍVEL =====
let nivelAtual = 50;
let nivelDestino = 50;

// ===== ANIMAÇÃO DA ÁGUA =====
function animar() {
  nivelAtual += (nivelDestino - nivelAtual) * 0.1;
  water.style.height = (nivelAtual * AREA_UTIL / 100) + "%";
  percent.innerText = nivelAtual.toFixed(1) + "%";
  requestAnimationFrame(animar);
}
requestAnimationFrame(animar);

// ===== GRÁFICO (Chart.js) =====
const ctx = document.getElementById('grafico').getContext('2d');
const grafico = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Nível (%)',
      data: [],
      borderColor: '#00c6ff',
      backgroundColor: 'rgba(0,198,255,0.15)',
      fill: true,
      tension: 0,
      pointRadius: 2
    }]
  },
  options: {
    responsive: true,
    animation: false,
    plugins: { legend: { display: false } },
    scales: { y: { min: 0, max: 100 } }
  }
});

// ===== LÓGICA DE ALERTAS E INTERFACE =====
function atualizarInterface(nivel, litros) {
  nivelDestino = nivel;

  if (litros !== undefined) {
    litrosText.innerText = Math.round(litros) + " L";
  }

  if (nivel <= 20) {
    water.style.background = "linear-gradient(to top,#ff0000,#ff4d4d)";
    litrosText.style.color = "#ff4d4d";
    statusText.innerText = "CRÍTICO";
    alertaGrande.innerText = "⚠ LIGAR A BOMBA";
    alertaGrande.style.background = "rgba(255, 0, 0, 0.9)";
    alertaGrande.style.display = "block";
  } 
  else if (nivel <= 25) {
    water.style.background = "linear-gradient(to top,#ff7b00,#ffc107)";
    litrosText.style.color = "#ffc107";
    statusText.innerText = "Baixo";
    alertaGrande.innerText = "⚠ LIGAR A BOMBA";
    alertaGrande.style.background = "rgba(255, 120, 0, 0.9)";
    alertaGrande.style.display = "block";
  } 
  else if (nivel >= 90) {
    water.style.background = "linear-gradient(to top,#0077ff,#00c6ff)";
    litrosText.style.color = "#00c6ff";
    statusText.innerText = "Quase Cheio";
    alertaGrande.innerText = "⛔ DESLIGAR A BOMBA";
    alertaGrande.style.background = "rgba(0, 255, 150, 0.9)";
    alertaGrande.style.display = "block";
  } 
  else {
    water.style.background = "linear-gradient(to top,#0077ff,#00c6ff)";
    litrosText.style.color = "#00c6ff";
    statusText.innerText = "Normal";
    alertaGrande.style.display = "none";
  }

  grafico.data.labels.push(new Date().toLocaleTimeString());
  grafico.data.datasets[0].data.push(nivel);
  if (grafico.data.labels.length > 20) {
    grafico.data.labels.shift();
    grafico.data.datasets[0].data.shift();
  }
  grafico.update('none');
}

// ===== LÓGICA DE SIMULAÇÃO AUTOMÁTICA =====
if (MODO_SIMULACAO) {
  let subindo = true;
  let simNivel = 50;

  setInterval(() => {
    // Varia o nível para simular enchimento/esvaziamento
    if (subindo) simNivel += 1;
    else simNivel -= 1;

    if (simNivel >= 100) subindo = false;
    if (simNivel <= 5) subindo = true;

    // CÁLCULO DE TRONCO DE CONE (SIMULADO)
    const h = (simNivel / 100) * H_UTIL;
    const raioAt = R_BASE + (R_TOPO - R_BASE) * (h / H_UTIL);
    const vol_cm3 = (3.14159 * h / 3.0) * (Math.pow(raioAt, 2) + (raioAt * R_BASE) + Math.pow(R_BASE, 2));
    const litrosSimulados = vol_cm3 / 1000.0;

    // Atualiza o Firebase automaticamente
    database.ref('/').update({
      nivel: simNivel,
      litros: litrosSimulados
    });

    // Atualiza a tela localmente
    atualizarInterface(simNivel, litrosSimulados);
  }, 5000); // Atualiza a cada 3 segundos
}

// ===== ESCUTA O FIREBASE EM TEMPO REAL (MODO REAL) =====
if (!MODO_SIMULACAO) {
  database.ref('/').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data !== null) {
      atualizarInterface(parseFloat(data.nivel), parseFloat(data.litros));
    }
  });
}
