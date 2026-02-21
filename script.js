const alertaGrande = document.getElementById("alertaGrande");

// ===== CONFIGURAÇÃO =====
const MODO_SIMULACAO = false; // 🟢 Alterado para false para usar o Firebase
const AREA_UTIL = 49; 

// CONFIGURAÇÕES DO SEU FIREBASE (Cole aqui o que você pegou no Console)
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

// ===== ANIMAÇÃO CONTÍNUA =====
function animar() {
  nivelAtual += (nivelDestino - nivelAtual) * 0.1;
  water.style.height = (nivelAtual * AREA_UTIL / 100) + "%";
  percent.innerText = nivelAtual.toFixed(1) + "%";
  requestAnimationFrame(animar);
}
requestAnimationFrame(animar);

// ===== GRÁFICO =====
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

// ===== ATUALIZAÇÃO VISUAL =====
function atualizarInterface(nivel) {
  nivelDestino = nivel;

  // Lógica de cores e alertas
  if (nivel <= 20) {
    water.style.background = "linear-gradient(to top,#ff0000,#ff4d4d)";
    statusText.innerText = "CRÍTICO";
    alertaGrande.innerText = "⚠ LIGAR A BOMBA";
    alertaGrande.style.background = "rgba(255, 0, 0, 0.9)";
    alertaGrande.style.display = "block";
  } 
  else if (nivel <= 25) {
    water.style.background = "linear-gradient(to top,#ff7b00,#ffc107)";
    statusText.innerText = "Baixo";
    alertaGrande.innerText = "⚠ LIGAR A BOMBA";
    alertaGrande.style.background = "rgba(255, 120, 0, 0.9)";
    alertaGrande.style.display = "block";
  } 
  else if (nivel >= 90) {
    water.style.background = "linear-gradient(to top,#0077ff,#00c6ff)";
    statusText.innerText = "Quase Cheio";
    alertaGrande.innerText = "⛔ DESLIGAR A BOMBA";
    alertaGrande.style.background = "rgba(0, 255, 150, 0.9)";
    alertaGrande.style.display = "block";
  } 
  else {
    water.style.background = "linear-gradient(to top,#0077ff,#00c6ff)";
    statusText.innerText = "Normal";
    alertaGrande.style.display = "none";
  }

  // Atualiza o gráfico com o novo ponto real
  grafico.data.labels.push(new Date().toLocaleTimeString());
  grafico.data.datasets[0].data.push(nivel);
  if (grafico.data.labels.length > 20) {
    grafico.data.labels.shift();
    grafico.data.datasets[0].data.shift();
  }
  grafico.update('none');
}

// ===== CONEXÃO REAL COM FIREBASE =====
if (!MODO_SIMULACAO) {
  database.ref('nivel').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data !== null) {
      atualizarInterface(parseFloat(data));
    }
  });
}
