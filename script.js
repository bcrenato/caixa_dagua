// ===== CONFIGURAÇÃO =====
const MODO_SIMULACAO = true; // false quando tiver ESP

// ===== ELEMENTOS =====
const water = document.getElementById("water");
const percent = document.getElementById("percent");
const statusText = document.getElementById("status");

let nivelAtual = 0;
let nivelDestino = 0;

// ===== ANIMAÇÃO ULTRA FLUIDA =====
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

// ===== FUNÇÃO ATUALIZAR =====
function atualizarInterface(data) {

  nivelDestino = data.nivel;

  if (data.nivel < 20) {
    water.style.background = "linear-gradient(to top,#ff0000,#ff7b00)";
    statusText.innerText = "CRÍTICO";
  } else if (data.nivel < 40) {
    water.style.background = "linear-gradient(to top,#ff7b00,#ffc107)";
    statusText.innerText = "Baixo";
  } else {
    water.style.background = "linear-gradient(to top,#0077ff,#00c6ff)";
    statusText.innerText = "Normal";
  }
}

// ===== MODO SIMULAÇÃO =====
if (MODO_SIMULACAO) {

  setInterval(() => {

    let nivel = Math.random() * 100;
    let timestamp = Math.floor(Date.now()/1000);

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

// ===== FIREBASE =====
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

  database.ref("historico").limitToLast(20).on("value", function(snapshot) {

    let labels = [];
    let valores = [];

    snapshot.forEach(function(child) {
      let item = child.val();
      let hora = new Date(item.timestamp * 1000);
      labels.push(hora.getHours() + ":" + hora.getMinutes());
      valores.push(item.nivel);
    });

    grafico.data.labels = labels;
    grafico.data.datasets[0].data = valores;
    grafico.update();
  });
}
nivelDestino = 100;
water.style.height = "100%";
percent.innerText = "100%";
