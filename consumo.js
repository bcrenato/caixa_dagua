// CONFIGURAÇÕES DO FIREBASE (Sincronizado com seu projeto)
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

// VARIÁVEIS DE CONTROLE
let medindo = false;
let litrosNoInicio = 0;
let litrosAtuaisDoSensor = 0;

// 1. ESCUTA O VALOR ATUAL DE LITROS DO SENSOR
database.ref('litros').on('value', (snapshot) => {
    litrosAtuaisDoSensor = parseFloat(snapshot.val()) || 0;
});

// 2. LÓGICA DO BOTÃO DE MEDIÇÃO
function toggleMedicao() {
    const btn = document.getElementById("btnMedir");
    const display = document.getElementById("displayConsumo");
    const nomeInput = document.getElementById("nomePessoa");
    const localSelect = document.getElementById("dispositivoGasto");

    if (!medindo) {
        // Validação: Nome opcional para Máquina e Torneira
        const local = localSelect.value;
        const precisaNome = (local !== "Máquina de Lavar" && local !== "Torneira Geral");

        if (precisaNome && !nomeInput.value.trim()) {
            alert("Por favor, digite o nome de quem vai usar o chuveiro!");
            return;
        }

        medindo = true;
        litrosNoInicio = litrosAtuaisDoSensor; // Grava volume inicial
        btn.innerText = "FINALIZAR E REGISTRAR";
        btn.style.background = "#ef4444";
        display.innerText = "Medindo...";
        display.style.color = "#ffc107";
    } else {
        medindo = false;
        let gastoTotal = Math.max(0, litrosNoInicio - litrosAtuaisDoSensor); // Diferença de nível
        
        // Identificador: Usa o nome digitado ou o nome do dispositivo selecionado
        let identificador = nomeInput.value.trim() || localSelect.value;

        btn.innerText = "INICIAR MEDIÇÃO";
        btn.style.background = "#22c55e";
        display.innerText = gastoTotal.toFixed(1) + " L";

        // Salva o registro completo com data e hora
        const agora = new Date();
        database.ref('historico_gasto').push({
            pessoa: identificador,
            dispositivo: localSelect.value,
            gasto: gastoTotal.toFixed(1),
            hora: agora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
            data: agora.toLocaleDateString('pt-BR')
        });
        
        nomeInput.value = ""; // Limpa campo de texto
    }
}

// 3. ATUALIZAÇÃO DO RANKING E TABELA EM TEMPO REAL
database.ref('historico_gasto').on('value', (snapshot) => {
    const dataSnap = snapshot.val();
    const corpoTabela = document.getElementById("corpoTabela");
    const rankingDiv = document.getElementById("rankingConsumo");

    if (!dataSnap) {
        corpoTabela.innerHTML = "<tr><td colspan='3' style='padding:20px;'>Sem registros recentes</td></tr>";
        return;
    }

    const registros = Object.values(dataSnap).reverse();
    const totais = {};
    corpoTabela.innerHTML = "";
    rankingDiv.innerHTML = "";

    registros.forEach((item, index) => {
        // Soma para o Ranking Acumulado
        totais[item.pessoa] = (totais[item.pessoa] || 0) + parseFloat(item.gasto);
        
        // Alimenta a Tabela de Histórico (últimos 10 registros)
        if(index < 10) {
            const corGasto = parseFloat(item.gasto) > 60 ? "#ff4d4d" : "#ffc107"; // Alerta vermelho acima de 60L
            corpoTabela.innerHTML += `
                <tr style="border-bottom: 1px solid #334155;">
                    <td style="padding:10px; text-align:left;">
                        <b style="font-size:15px;">${item.pessoa}</b><br>
                        <small style="color: #94a3b8;">${item.dispositivo}</small>
                    </td>
                    <td style="color:${corGasto}; font-weight:bold; font-size:16px;">${item.gasto}L</td>
                    <td style="text-align:right; font-size:11px; color:#94a3b8;">
                        ${item.data}<br>${item.hora}
                    </td>
                </tr>`;
        }
    });

    // 4. GERAÇÃO DO RANKING VISUAL
    const rankingOrdenado = Object.entries(totais).sort((a,b) => b[1] - a[1]);
    const maxVal = rankingOrdenado[0][1];

    rankingOrdenado.forEach(([nome, total]) => {
        const percentual = (total / maxVal) * 100;
        const corBarra = total > 200 ? "#ef4444" : "#22c55e"; // Alerta vermelho acima de 200L total
        
        rankingDiv.innerHTML += `
            <div style="margin-bottom: 12px;">
                <div style="display:flex; justify-content:space-between; font-size: 14px;">
                    <span><b>${nome}</b></span>
                    <b style="color: ${corBarra}">${total.toFixed(1)}L</b>
                </div>
                <div style="width: 100%; background: #334155; height: 10px; border-radius: 5px; margin-top: 4px;">
                    <div style="width: ${percentual}%; background: ${corBarra}; height: 100%; border-radius: 5px; transition: width 0.8s;"></div>
                </div>
            </div>`;
    });
});
