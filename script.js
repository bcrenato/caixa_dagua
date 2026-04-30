const alertaGrande = document.getElementById("alertaGrande");
const litrosText = document.getElementById("litrosText");
const percent = document.getElementById("percent");
const statusText = document.getElementById("status");
const water = document.getElementById("water");

const AREA_UTIL = 49; 
let notificacaoEnviada = false;

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
  }

  // --- NOVA LÓGICA DE ALERTAS (NÃO GRAVA REGISTROS) ---

  if (nivel <= 25) { // Nível Muito Crítico
    statusText.innerText = "MUITO CRÍTICO";
    alertaGrande.innerText = "🚨 PERIGO: CAIXA VAZIA!";
    alertaGrande.style.display = "block";
    if (!notificacaoEnviada) {
      enviarTelegram("🚨 Atenção: Nível Muito Crítico! " + nivel.toFixed(1) + "%""ligue a Bomba urgente);
      avisarAlexa("caixamuitocritica"); // Gatilho Alexa para 25%
      notificacaoEnviada = true;
    }
  } 
  else if (nivel <= 40) { // Ligar a Bomba
    statusText.innerText = "LIGAR BOMBA";
    alertaGrande.innerText = "⚠ ABAIXO DE 40%: LIGAR BOMBA";
    alertaGrande.style.display = "block";
    if (!notificacaoEnviada) {
      enviarTelegram("⚠ Atenção : Nível em 40%. Ligue a bomba!");
      avisarAlexa("ligarbomba"); // Gatilho Alexa para 40%
      notificacaoEnviada = true;
    }
  } 
  else if (nivel >= 87) { // Caixa Cheia
    statusText.innerText = "Caixa Cheia";
    alertaGrande.innerText = "⛔ DESLIGAR A BOMBA";
    alertaGrande.style.display = "block";
    if (!notificacaoEnviada) {
      enviarTelegram("🔔 ATENÇÃO: Caixa d'Água Encheu! " + nivel.toFixed(1) + "%"" Desligue a Bomba.");
      avisarAlexa("caixacheia"); // Gatilho Alexa para Cheio
      notificacaoEnviada = true;
    }
  } 
  else {
    statusText.innerText = "Normal";
    alertaGrande.style.display = "none";
    // Reseta o envio de notificações quando o nível volta para a faixa segura
    if (nivel > 45 && nivel < 80) {
        notificacaoEnviada = false;
    }
  }
}

// OUVINTE EM TEMPO REAL (Focado apenas na Interface)
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

function avisarAlexa(monkeyDevice) {
  // O parâmetro monkeyDevice permite que você use sons diferentes para cada alerta
  fetch(`https://api-v2.voicemonkey.io/trigger?token=9ed63e20213795a3af8393dcab767373_8ca1d0a8f948bcc2ce71d8eb5c58d622&device=${monkeyDevice}&monkey=${monkeyDevice}`);
}
