// ===== CONFIGURAÇÃO =====
const MODO_SIMULACAO = true; // coloque false quando usar Firebase

// ===== ELEMENTOS =====
const water = document.getElementById("water");
const percent = document.getElementById("percent");
const statusText = document.getElementById("status");

let nivelAtual = 0;
let nivelDestino = 0;

// ===== ANIMAÇÃO SUAVE =====
function animar() {
  if (Math.abs(nivelAtual - nivelDestino) > 0.1) {
    nivelAtual += (nivelDestino - nivelAtual) * 0.05;
    water.style.height = nivelAtual + "%";
    percent.innerText = nivelAtual.toFixed(1) + "%";
  }
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
      backgroundColor: 'rgba(0,198,255,0.1)',
      tension: 0.4
    }]
  },
  options: {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { min: 0, max: 100 } }
  }
});

// ===== ATUALIZAÇÃO VISUAL =====
function atualizarInterface(data) {

  nivelDestino = data.nivel;

  // 🔥 CRÍTICO AGORA É 10%
  if (data.nivel <= 10) {
    water.style.background = "linear-gradient(to top,#ff0000,#ff4d4d)";
    statusText.innerText = "CRÍTICO";
  } 
  else if (data.nivel <= 30) {
    water.style.background = "linear-gradient(to top,#ff7b00,#ffc107)";
    statusText.innerText = "Baixo";
  } 
  else {
    water.style.background = "linear-gradient(to top,#0077ff,#00c6ff)";
    statusText.innerText = "Normal";
  }
}

// ===== SIMULAÇÃO =====
if (MODO_SIMULACAO) {

  setInterval(() => {

    let nivel = Math.random() * 100;

    atualizarInterface({ nivel });

    grafico.data.labels.push(new Date().toLocaleTimeString());
    grafico.data.datasets[0].data.push(nivel);

    if (grafico.data.labels.length > 20) {
      grafico.data.labels.shift();
      grafico.data.datasets[0].data.shift();
    }

    grafico.update();

  }, 3000);

}

// ===== FIREBASE (quando desativar simulação) =====
if (!MODO_SIMULACAO) {

  var firebaseConfig = {
    apiKey: "SUA_API_KEY",
    databaseURL: "SUA_DATABASE_URL"
  };

  firebase.initializeApp(firebaseConfig);
  var database = firebase.database();

  database.ref("caixa").on("value", function(snapshot) {
    atualizarInterface(snapshot.val());
  });

}
