const alertaGrande = document.getElementById("alertaGrande");
const litrosText = document.getElementById("litrosText");
const percent = document.getElementById("percent");
const statusText = document.getElementById("status");
const water = document.getElementById("water");

const AREA_UTIL = 49; 
let notificacaoEnviada = false;
let ultimoValorEstavel = null; 
let filtroHome = 'hoje';

let menorValorAtual = null;
let ultimoValorValido = null;

// --- TRAVA DE SEGURANÇA CONTRA REPETIÇÃO ---
let ultimaGravacao = 0; // Armazena o tempo da última gravação

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
  if (litros !== undefined) {
      litrosText.innerText = Math.round(litros) + " L";
      processarConsumoAutomatico(litros); 
  }

  if (nivel <= 20) {
    statusText.innerText = "CRÍTICO";
    alertaGrande.innerText = "⚠ LIGAR A BOMBA";
    alertaGrande.style.display = "block";
  } else if (nivel >= 87) {
    statusText.innerText = "Caixa Cheia";
    alertaGrande.innerText = "⛔ DESLIGAR A BOMBA";
    alertaGrande.style.display = "block";
    if (!notificacaoEnviada) {
      enviarTelegram("🔔 MONITOR: Caixa Cheia em Nilópolis! " + nivel.toFixed(1) + "%");
      avisarAlexa();
      notificacaoEnviada = true;
    }
  } else {
    statusText.innerText = "Normal";
    alertaGrande.style.display = "none";
    if (nivel < 80) notificacaoEnviada = false;
  }
}

// ===== LÓGICA DE CATRACA COM BLOQUEIO POR TEMPO =====
function processarConsumoAutomatico(litrosAtuais) {

    if (ultimoValorValido === null) {
        ultimoValorValido = litrosAtuais;
        menorValorAtual = litrosAtuais;
        return;
    }

    // 🔼 IGNORA subida (ruído ou pequena reposição)
    if (litrosAtuais > ultimoValorValido) {
        ultimoValorValido = litrosAtuais;
        return;
    }

    // 🔽 SÓ ACEITA NOVO MÍNIMO REAL (anti-oscilação)
    if (litrosAtuais < (menorValorAtual - 2.0)) {

        let consumo = menorValorAtual - litrosAtuais;

        salvarGastoFirebase(consumo);

        menorValorAtual = litrosAtuais;
        ultimoValorValido = litrosAtuais;
    }

    // 🔄 RESET se caixa encher (subida grande)
    else if (litrosAtuais > (menorValorAtual + 10.0)) {
        menorValorAtual = litrosAtuais;
        ultimoValorValido = litrosAtuais;
    }
}

function salvarGastoFirebase(quantidade) {
    const hoje = new Date().toLocaleDateString('pt-BR');

    const ref = database.ref('consumo_diario/' + hoje);

    ref.transaction((valorAtual) => {
        return (valorAtual || 0) + quantidade;
    });
}

function mudarFiltroHome(tipo) {
    filtroHome = tipo;
    document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('btn' + tipo.charAt(0).toUpperCase() + tipo.slice(1));
    if(btn) btn.classList.add('active');
    document.getElementById('labelGasto').innerText = "Gasto " + (tipo === 'hoje' ? 'Hoje' : tipo === 'semana' ? '7 Dias' : '30 Dias');
    atualizarDisplayGasto();
}

function atualizarDisplayGasto() {
    database.ref('consumo_diario').on('value', (snapshot) => {
        const data = snapshot.val();
        let soma = 0;
        const hoje = new Date();
        const hojeStr = hoje.toLocaleDateString('pt-BR');

        if (data) {
            Object.entries(data).forEach(([dataStr, valor]) => {

                const partes = dataStr.split('/');
                const dataItem = new Date(partes[2], partes[1] - 1, partes[0]);

                const diffDias = (hoje - dataItem) / (1000 * 60 * 60 * 24);

                if (filtroHome === 'hoje' && dataStr === hojeStr) {
                    soma += valor;
                } 
                else if (filtroHome === 'semana' && diffDias <= 7) {
                    soma += valor;
                } 
                else if (filtroHome === 'mes' && diffDias <= 30) {
                    soma += valor;
                }
            });
        }

        const display = document.getElementById("totalLitrosHome");
        if(display) {
            display.innerText = soma.toFixed(1) + " L";
            display.style.color = soma > 500 ? "#ef4444" : "#22c55e";
        }
    });
}

database.ref('/').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) atualizarInterface(parseFloat(data.nivel), parseFloat(data.litros));
});
atualizarDisplayGasto();

function enviarTelegram(msg) {
  const token = "8533439908:AAFtykn10UsOEz_NTMPU6pFcptyg0KlYpeI";
  const chat = "554870921";
  fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat}&text=${encodeURIComponent(msg)}`);
}

function avisarAlexa() {
  fetch("https://api-v2.voicemonkey.io/trigger?token=9ed63e20213795a3af8393dcab767373_8ca1d0a8f948bcc2ce71d8eb5c58d622&device=caixacheia&monkey=caixacheia");
}
