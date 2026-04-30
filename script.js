const alertaGrande = document.getElementById("alertaGrande");
const litrosText = document.getElementById("litrosText");
const percent = document.getElementById("percent");
const statusText = document.getElementById("status");
const water = document.getElementById("water");

// --- NOVAS CONFIGURAÇÕES INTEGRADAS DO SCRIPT2 ---
const MODO_SIMULACAO = false; // Mude para true para testar sem o sensor
const R_BASE = 58.0;
const R_TOPO = 75.5;
const H_UTIL = 76.0;
// ------------------------------------------------

const AREA_UTIL = 49; 

// MODIFICAÇÃO: Criadas variáveis separadas para cada nível de alerta.
// Isso impede que uma notificação bloqueie a outra.
let notificacao25Enviada = false;
let notificacao40Enviada = false;
let notificacao87Enviada = false;

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
  if(water) water.style.height = (nivelAtualAnim * AREA_UTIL / 100) + "%";
  if(percent) percent.innerText = nivelAtualAnim.toFixed(1) + "%";
  requestAnimationFrame(animar);
}
requestAnimationFrame(animar);

function atualizarInterface(nivel, litros) {
  nivelDestino = nivel;
  
  if (litros !== undefined && litrosText) {
      litrosText.innerText = Math.round(litros) + " L";
  }

  // --- LÓGICA DE CORES DINÂMICAS DO SCRIPT2 ---
  if (nivel <= 25) { 
    if(water) water.style.background = "linear-gradient(to top, #ff0000, #ff4d4d)"; // Vermelho
    statusText.innerText = "MUITO CRÍTICO";
    alertaGrande.innerText = "🚨 PERIGO: CAIXA VAZIA!";
    alertaGrande.style.display = "block";
    
    // MODIFICAÇÃO: Checa a trava específica de 25%
    if (!notificacao25Enviada) {
      enviarTelegram("🚨 Atenção: Nível Muito Crítico! " + nivel.toFixed(1) + "% - Não abra os Registros de água.");
      avisarAlexa("caixamuitocritica"); 
      notificacao25Enviada = true;
      notificacao40Enviada = false; // Reseta o de 40 para caso o nível suba novamente
    }
  } 
  else if (nivel <= 40) { 
    if(water) water.style.background = "linear-gradient(to top, #ff7b00, #ffc107)"; // Amarelo/Laranja
    statusText.innerText = "LIGAR BOMBA";
    alertaGrande.innerText = "⚠ ABAIXO DE 40%: LIGAR BOMBA";
    alertaGrande.style.display = "block";
    
    // MODIFICAÇÃO: Checa a trava específica de 40%
    if (!notificacao40Enviada) {
      enviarTelegram("⚠ Atenção: Nível em 40%. Ligue a bomba urgente!");
      avisarAlexa("ligarbomba"); 
      notificacao40Enviada = true;
      notificacao25Enviada = false; // Reseta o de 25 para caso o nível continue caindo
      notificacao87Enviada = false; 
    }
  } 
  else if (nivel >= 87) { 
    if(water) water.style.background = "linear-gradient(to top, #0077ff, #00c6ff)"; // Azul
    statusText.innerText = "Caixa Cheia";
    alertaGrande.innerText = "⛔ DESLIGAR A BOMBA";
    alertaGrande.style.display = "block";
    
    // MODIFICAÇÃO: Checa a trava específica de 87%
    if (!notificacao87Enviada) {
      enviarTelegram("🔔 ATENÇÃO: Caixa d'Água Encheu! " + nivel.toFixed(1) + "% - Desligue a Bomba.");
      avisarAlexa("caixacheia"); 
      notificacao87Enviada = true;
      notificacao40Enviada = false; // Permite avisar de 40% novamente quando a água baixar
    }
  } 
  else {
    if(water) water.style.background = "linear-gradient(to top, #0077ff, #00c6ff)"; // Azul
    statusText.innerText = "Normal";
    alertaGrande.style.display = "none";
    
    // MODIFICAÇÃO: Reset de todas as travas quando o nível está na faixa de normalidade
    if (nivel > 45 && nivel < 80) {
        notificacao25Enviada = false;
        notificacao40Enviada = false;
        notificacao87Enviada = false;
    }
  }
}

// ===== LÓGICA DE SIMULAÇÃO (DO SCRIPT2) =====
if (MODO_SIMULACAO) {
  let subindo = true;
  let simNivel = 50;

  setInterval(() => {
    if (subindo) simNivel += 0.5;
    else simNivel -= 0.5;

    if (simNivel >= 100) subindo = false;
    if (simNivel <= 5) subindo = true;

    // FÓRMULA TRONCO DE CONE INTEGRADA
    const h = (simNivel / 100) * H_UTIL;
    const raioAt = R_BASE + (R_TOPO - R_BASE) * (h / H_UTIL);
    const vol_cm3 = (3.14159 * h / 3.0) * (Math.pow(raioAt, 2) + (raioAt * R_BASE) + Math.pow(R_BASE, 2));
    const litrosSimulados = vol_cm3 / 1000.0;

    atualizarInterface(simNivel, litrosSimulados);
  }, 500); 
}

// OUVINTE EM TEMPO REAL (SÓ ATIVA SE NÃO ESTIVER SIMULANDO)
if (!MODO_SIMULACAO) {
    database.ref('/').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.nivel !== undefined) {
            atualizarInterface(parseFloat(data.nivel), parseFloat(data.litros));
        }
    });
}

function enviarTelegram(msg) {
  const token = "8533439908:AAFtykn10UsOEz_NTMPU6pFcptyg0KlYpeI";
  const chat = "554870921";
  fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat}&text=${encodeURIComponent(msg)}`);
}

function avisarAlexa(monkeyDevice) {
  fetch(`https://api-v2.voicemonkey.io/trigger?token=9ed63e20213795a3af8393dcab767373_8ca1d0a8f948bcc2ce71d8eb5c58d622&device=${monkeyDevice}&monkey=${monkeyDevice}`);
}
