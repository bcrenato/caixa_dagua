const alertaGrande = document.getElementById("alertaGrande");
const litrosText = document.getElementById("litrosText");
const percent = document.getElementById("percent");
const statusText = document.getElementById("status");
const water = document.getElementById("water");

// ===== CONFIGURAÇÕES =====
const AREA_UTIL = 49; 
let notificacaoEnviada = false;
let filtroHome = 'hoje';

// Variáveis para a Trava de Piso Absoluto
let ultimoValorGravadoNoBanco = null; 
let listaLeituras = [];
const TAMANHO_FILTRO = 30; // Média para suavizar o sinal do potenciômetro

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
      processarConsumoUnico(litros); 
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

// ===== LÓGICA DE PISO ABSOLUTO (SEM REPETIÇÃO) =====
function processarConsumoUnico(litrosAtuais) {
    // 1. Aplica média móvel para estabilizar a leitura
    listaLeituras.push(litrosAtuais);
    if (listaLeituras.length > TAMANHO_FILTRO) listaLeituras.shift();
    const mediaAtual = listaLeituras.reduce((a, b) => a + b, 0) / listaLeituras.length;

    if (ultimoValorGravadoNoBanco === null) {
        ultimoValorGravadoNoBanco = mediaAtual;
        return;
    }

    // 2. REGRA: Só grava se a média atual for MENOR que o último registro (margem de 1L)
    if (mediaAtual < (ultimoValorGravadoNoBanco - 1.0)) {
        let gastoReal = ultimoValorGravadoNoBanco - mediaAtual;
        
        salvarGastoFirebase(gastoReal);
        
        // Atualiza a trava: agora o novo "piso" é esse valor mais baixo
        ultimoValorGravadoNoBanco = mediaAtual; 
    } 
    
    // 3. RESET: Se a caixa subir (enchente), a trava acompanha o novo topo
    else if (mediaAtual > (ultimoValorGravadoNoBanco + 10.0)) {
        ultimoValorGravadoNoBanco = mediaAtual;
    }
}

function salvarGastoFirebase(quantidade) {
    const hoje = new Date().toLocaleDateString('pt-BR');
    database.ref('historico_automatico').push({
        data: hoje,
        timestamp: Date.now(),
        gasto: quantidade.toFixed(2)
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
    database.ref('historico_automatico').on('value', (snapshot) => {
        const data = snapshot.val();
        let soma = 0;
        const agora = Date.now();
        const hoje = new Date().toLocaleDateString('pt-BR');
        
        let limiteMs = 0;
        if (filtroHome === 'semana') limiteMs = 7 * 24 * 60 * 60 * 1000;
        if (filtroHome === 'mes') limiteMs = 30 * 24 * 60 * 60 * 1000;

        if (data) {
            Object.values(data).forEach(item => {
                if (filtroHome === 'hoje') {
                    if (item.data === hoje) soma += parseFloat(item.gasto);
                } else {
                    if (agora - item.timestamp <= limiteMs) soma += parseFloat(item.gasto);
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

// Inicialização
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
