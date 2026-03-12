// CONFIGURAÇÕES DO FIREBASE
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

let medindo = false;
let litrosNoInicio = 0;
let litrosAtuaisDoSensor = 0;

// 1. ESCUTA O SENSOR E ATUALIZA DISPLAY EM TEMPO REAL
database.ref('litros').on('value', (snapshot) => {
    litrosAtuaisDoSensor = parseFloat(snapshot.val()) || 0;
    if (medindo) {
        const display = document.getElementById("displayConsumo");
        let gastoParcial = Math.max(0, litrosNoInicio - litrosAtuaisDoSensor);
        display.innerText = gastoParcial.toFixed(1) + " L";
        if (gastoParcial > 60) {
            display.style.color = ""; 
            display.classList.add("piscar-alerta");
        } else {
            display.classList.remove("piscar-alerta");
            display.style.color = "#ffc107";
        }
    }
});

// 2. CONTROLE DA MEDIÇÃO
function toggleMedicao() {
    const btn = document.getElementById("btnMedir");
    const display = document.getElementById("displayConsumo");
    const nomeInput = document.getElementById("nomePessoa");
    const localSelect = document.getElementById("dispositivoGasto");

    if (!medindo) {
        const precisaNome = (localSelect.value !== "Máquina de Lavar" && localSelect.value !== "Torneira Geral");
        if (precisaNome && !nomeInput.value.trim()) {
            alert("Por favor, digite o nome!"); return;
        }
        medindo = true;
        litrosNoInicio = litrosAtuaisDoSensor;
        btn.innerText = "FINALIZAR E SALVAR";
        btn.style.background = "#ef4444";
        display.innerText = "0.0 L";
    } else {
        medindo = false;
        let gastoFinal = Math.max(0, litrosNoInicio - litrosAtuaisDoSensor);
        let identificador = nomeInput.value.trim() || localSelect.value;

        database.ref('historico_gasto').push({
            pessoa: identificador,
            dispositivo: localSelect.value,
            gasto: gastoFinal.toFixed(1),
            hora: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
            data: new Date().toLocaleDateString('pt-BR')
        });
        
        btn.innerText = "INICIAR MEDIÇÃO";
        btn.style.background = "#22c55e";
        nomeInput.value = "";
    }
}

// 3. ATUALIZAÇÃO DO RANKING (ÚLTIMOS 7 DIAS) E TABELA
database.ref('historico_gasto').on('value', (snapshot) => {
    const dataSnap = snapshot.val();
    const corpoTabela = document.getElementById("corpoTabela");
    const rankingDiv = document.getElementById("rankingConsumo");
    if (!dataSnap) {
        corpoTabela.innerHTML = "<tr><td>Sem registros</td></tr>";
        rankingDiv.innerHTML = ""; return;
    }

    const registrosEntries = Object.entries(dataSnap).reverse();
    const totais = {};
    corpoTabela.innerHTML = "";
    rankingDiv.innerHTML = "";

    const umaSemanaAtras = new Date();
    umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);

    registrosEntries.forEach(([key, item], index) => {
        // Cálculo para o Ranking (Filtro Semanal)
        const dPartes = item.data.split('/');
        const dReg = new Date(dPartes[2], dPartes[1]-1, dPartes[0]);
        if (dReg >= umaSemanaAtras) {
            totais[item.pessoa] = (totais[item.pessoa] || 0) + parseFloat(item.gasto);
        }

        // Tabela com opção de excluir
        if(index < 8) {
            const cor = parseFloat(item.gasto) > 60 ? "#ff4d4d" : "#ffc107";
            corpoTabela.innerHTML += `
                <tr style="border-bottom: 1px solid #334155;">
                    <td style="padding:10px; text-align:left;"><b>${item.pessoa}</b></td>
                    <td style="color:${cor}; font-weight:bold;">${item.gasto}L</td>
                    <td style="text-align:right; font-size:11px; color:#94a3b8;">
                        ${item.hora} <button class="btn-delete-item" onclick="excluirItem('${key}')">✖</button>
                    </td>
                </tr>`;
        }
    });

    // Ranking Visual com Metas
    const ordenado = Object.entries(totais).sort((a,b) => b[1]-a[1]);
    if (ordenado.length > 0) {
        const max = ordenado[0][1];
        ordenado.forEach(([nome, total]) => {
            const perc = (total / max) * 100;
            let corBarra = "#22c55e"; // Verde (OK)
            if(total > 150) corBarra = "#f59e0b"; // Laranja (Alerta)
            if(total > 250) corBarra = "#ef4444"; // Vermelho (Excesso)

            rankingDiv.innerHTML += `
                <div class="ranking-bar">
                    <div style="display:flex; justify-content:space-between; font-size:13px;">
                        <span>${nome}</span><b>${total.toFixed(1)}L</b>
                    </div>
                    <div class="bar-bg"><div class="bar-fill" style="width:${perc}%; background:${corBarra};"></div></div>
                </div>`;
        });
    }
});

// 4. FUNÇÕES DE EXCLUSÃO
function excluirItem(id) {
    if(confirm("Excluir este gasto?")) database.ref('historico_gasto/' + id).remove();
}

function limparHistoricoTotal() {
    if(confirm("⚠️ Isso zerará o ranking e todo o histórico. Confirmar?")) database.ref('historico_gasto').remove();
}

function verificarDispositivo() {
    const local = document.getElementById("dispositivoGasto").value;
    const nome = document.getElementById("nomePessoa");
    nome.placeholder = (local === "Máquina de Lavar" || local === "Torneira Geral") ? "Opcional" : "Nome da Pessoa";
}
