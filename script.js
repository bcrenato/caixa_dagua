const alertaGrande = document.getElementById("alertaGrande");

// ===== CONFIGURAÇÃO =====
const MODO_SIMULACAO = true;
const AREA_UTIL = 49; // igual ao max-height do CSS

// ===== ELEMENTOS =====
const water = document.getElementById("water");
const percent = document.getElementById("percent");
const statusText = document.getElementById("status");

// ===== CONTROLE DE NÍVEL =====
let nivelAtual = 50;
let nivelDestino = 50;

// ===== ANIMAÇÃO CONTÍNUA =====
function animar() {

  // aproxima suavemente
  nivelAtual += (nivelDestino - nivelAtual) * 0.1;

  // conversão proporcional correta
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
      tension: 0, // 🔥 sem curva suavizada
      pointRadius: 2
    }]
  },
  options: {
    responsive: true,
    animation: false, // 🔥 desativa animação do gráfico
    plugins: { legend: { display: false } },
    scales: {
      y: {
        min: 0,
        max: 100
      }
    }
  }
});

// ===== ATUALIZAÇÃO VISUAL =====
function atualizarInterface(nivel) {

  nivelDestino = nivel;

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
}

// ===== SIMULAÇÃO REALISTA =====
if (MODO_SIMULACAO) {

  let nivel = 50;
  let bombaLigada = false;

  setInterval(() => {

    let consumo = Math.random() * 1.5;

    if (bombaLigada) {
      nivel += 2;
      nivel -= consumo;
    } else {
      nivel -= consumo;
    }

    if (nivel >= 100) {
      nivel = 100;
      bombaLigada = false;
    }

    if (nivel <= 0) {
      nivel = 0;
    }

    if (nivel <= 20) {
      bombaLigada = true;
    }

    atualizarInterface(nivel);

    // gráfico
    grafico.data.labels.push(new Date().toLocaleTimeString());
    grafico.data.datasets[0].data.push(nivel);

    if (grafico.data.labels.length > 20) {
      grafico.data.labels.shift();
      grafico.data.datasets[0].data.shift();
    }

    grafico.update('none');

  }, 1000);
}
