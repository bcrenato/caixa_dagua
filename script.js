const alertaGrande = document.getElementById("alertaGrande");
const litrosText = document.getElementById("litrosText");
const percent = document.getElementById("percent");
const statusText = document.getElementById("status");
const water = document.getElementById("water");

const AREA_UTIL = 49; 
let notificacaoEnviada = false;
let ultimoValorEstavel = null; 
let ultimaGravacao = 0; 

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

let nivelDestino = 0;
let nivelAtualAnim = 0;

function animar() {
  nivelAtualAnim += (nivelDestino - nivelAtualAnim) * 0.1;
  water.style.height = (nivelAtualAnim * AREA_UTIL / 100) + "%";
  percent.innerText = nivelAtualAnim.toFixed(1) + "%";
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
      enviarTelegram("🔔 MONITOR: Caixa Cheia! " + nivel.toFixed(1) + "%");
      avisarAlexa();
      notificacaoEnviada = true;
    }
  } else {
    statusText.innerText = "Normal";
    alertaGrande.style.display = "none";
    if (nivel < 80) notificacaoEnviada = false;
  }
}

function processarConsumoAutomatico(litrosAtuais) {
    const agora = Date.now();
    if (ultimoValorEstavel === null) {
        ultimoValorEstavel = litrosAtuais;
        return;
    }

    // Grava se houver queda real > 2L e se passou 10 segundos da última gravação
    if (litrosAtuais < (ultimoValorEstavel - 2.0)) {
        if (agora - ultimaGravacao < 10000) return; 

        let gasto = ultimoValorEstavel - litrosAtuais;
        const hoje = new Date().toLocaleDateString('pt-BR');
        
        database.ref('historico_automatico').push({
            data: hoje,
            timestamp: agora,
            gasto: gasto.toFixed(2)
        });
        
        ultimoValorEstavel = litrosAtuais;
        ultimaGravacao = agora;
    } 
    else if (litrosAtuais > (ultimoValorEstavel + 10.0)) {
        ultimoValorEstavel = litrosAtuais;
    }
}

// Ouvinte em Tempo Real do Firebase
database.ref('/').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data && data.nivel !== undefined) {
        atualizarInterface(parseFloat(data.nivel), parseFloat(data.litros));
    }
});

function enviarTelegram(msg) {
  const token = "8533439908:AAFtykn10UsOEz_NTMPU6pFcptyg0KlYpeI";
  const chat = "554870921";
  fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat}&text=${encodeURIComponent(msg)}`);
}

function avisarAlexa() {
  fetch("https://api-v2.voicemonkey.io/trigger?token=9ed63e20213795a3af8393dcab767373_8ca1d0a8f948bcc2ce71d8eb5c58d622&device=caixacheia&monkey=caixacheia");
}
