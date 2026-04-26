const alertaGrande = document.getElementById("alertaGrande");
const litrosText = document.getElementById("litrosText");

const MODO_SIMULACAO = false; 
const AREA_UTIL = 49; 
let notificacaoEnviada = false;

const R_BASE = 58.0;
const R_TOPO = 75.5;
const H_UTIL = 76.0;

const firebaseConfig = {
  apiKey: "AIzaSyCQipZjlc86GtZGx3_aoyCT-jDrZ1oYyYM",
  authDomain: "monitor-caixa-agua-ff63a.firebaseapp.com",
  databaseURL: "https://monitor-caixa-agua-ff63a-default-rtdb.firebaseio.com",
  projectId: "monitor-caixa-agua-ff63a",
  storageBucket: "monitor-caixa-agua-ff63a.firebasestorage.app",
  messagingSenderId: "176234978770",
  appId: "1:176234978770:web:e193d8242f4f111abd3c0b"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const water = document.getElementById("water");
const percent = document.getElementById("percent");
const statusText = document.getElementById("status");

let nivelAtual = 0;
let nivelDestino = 0;

function animar() {
  nivelAtual += (nivelDestino - nivelAtual) * 0.1;
  water.style.height = (nivelAtual * AREA_UTIL / 100) + "%";
  percent.innerText = nivelAtual.toFixed(1) + "%";
  requestAnimationFrame(animar);
}
requestAnimationFrame(animar);

function atualizarInterface(nivel, litros) {
  nivelDestino = nivel;
  if (litros !== undefined) litrosText.innerText = Math.round(litros) + " L";

  if (nivel <= 20) {
    statusText.innerText = "CRÍTICO";
    alertaGrande.innerText = "⚠ LIGAR A BOMBA";
    alertaGrande.style.display = "block";
  } 
  else if (nivel >= 87) {
    statusText.innerText = "Caixa Cheia";
    alertaGrande.innerText = "⛔ DESLIGAR A BOMBA";
    alertaGrande.style.display = "block";
    if (!notificacaoEnviada) {
      enviarTelegram("🔔 ATENÇÃO: Caixa d'Água Encheu! Nível: " + nivel.toFixed(1) + "%.");
      avisarAlexa();
      notificacaoEnviada = true;
    }
  } 
  else {
    statusText.innerText = "Normal";
    alertaGrande.style.display = "none";
    if (nivel < 80) notificacaoEnviada = false;
  }
}

// Função para exibir o gasto diário na Home
function monitorarGastoHome() {
    const displayHome = document.getElementById("totalLitrosDiaHome");
    if (!displayHome) return;
    database.ref('historico_gasto').on('value', (snapshot) => {
        const data = snapshot.val();
        let somaHoje = 0;
        const hoje = new Date().toLocaleDateString('pt-BR');
        if (data) {
            Object.values(data).forEach(item => {
                if (item.data === hoje) somaHoje += parseFloat(item.gasto);
            });
        }
        displayHome.innerText = somaHoje.toFixed(1) + " L";
        displayHome.style.color = somaHoje > 400 ? "#ef4444" : "#22c55e";
    });
}
monitorarGastoHome();

if (!MODO_SIMULACAO) {
  database.ref('/').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) atualizarInterface(parseFloat(data.nivel), parseFloat(data.litros));
  });
}

function enviarTelegram(mensagem) {
  const token = "8533439908:AAFtykn10UsOEz_NTMPU6pFcptyg0KlYpeI";
  const chatId = "554870921";
  fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(mensagem)}`);
}

function avisarAlexa() {
  const url = "https://api-v2.voicemonkey.io/trigger?token=9ed63e20213795a3af8393dcab767373_8ca1d0a8f948bcc2ce71d8eb5c58d622&device=caixacheia&monkey=caixacheia";
  fetch(url);
}
