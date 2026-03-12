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

// 1. ESCUTA SENSOR
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

// 2. MEDIÇÃO
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

// 3. ATUALIZAÇÃO DA INTERFACE (RANKING E TABELA)
function atualizarInterface() {
    database.ref('historico_gasto').once('value', (snapshot) => {
        const dataSnap = snapshot.val();
        const corpoTabela = document.getElementById("corpoTabela");
        const rankingDiv = document.getElementById("rankingConsumo");
        const filtroData = document.getElementById("filtroCalendario").value;
        const tituloRanking = document.getElementById("tituloRanking");

        if (!dataSnap) {
            corpoTabela.innerHTML = "<tr><td>Sem registros</td></tr>";
            rankingDiv.innerHTML = ""; return;
        }

        const registrosEntries = Object.entries(dataSnap).reverse();
        const totais = {};
        corpoTabela.innerHTML = "";
        rankingDiv.innerHTML = "";

        // Formata a data do calendário para comparar (YYYY-MM-DD -> DD/MM/YYYY)
        let dataFiltroFormatada = "";
        if (filtroData) {
            const partes = filtroData.split('-');
            dataFiltroFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
            tituloRanking.innerText = `📅 Ranking ${dataFiltroFormatada}`;
        } else {
            tituloRanking.innerText = `🏆 Ranking Semanal`;
        }

        const umaSemanaAtras = new Date();
        umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);

        registrosEntries.forEach(([key, item], index) => {
            const dPartes = item.data.split('/');
            const dReg = new Date(dPartes[2], dPartes[1]-1, dPartes[0]);

            // LÓGICA DO FILTRO: Se calendário estiver vazio, usa 7 dias. Se não, usa o dia escolhido.
            let deveIncluirNoRanking = false;
            if (filtroData) {
                if (item.data === dataFiltroFormatada) deveIncluirNoRanking = true;
            } else {
                if (dReg >= umaSemanaAtras) deveIncluirNoRanking = true;
            }

            if (deveIncluirNoRanking) {
                totais[item.pessoa] = (totais[item.pessoa] || 0) + parseFloat(item.gasto);
            }

            // Histórico sempre mostra os últimos 10
            if(index < 10) {
                const cor = parseFloat(item.gasto) > 60 ? "#ff4d4d" : "#ffc107";
                corpoTabela.innerHTML += `
                    <tr style="border-bottom: 1px solid #334155;">
                        <td style="padding:10px; text-align:left;"><b>${item.pessoa}</b><br><small>${item.dispositivo}</small></td>
                        <td style="color:${cor}; font-weight:bold;">${item.gasto}L</td>
                        <td style="text-align:right; font-size:11px; color:#94a3b8;">
                            ${item.data}<br>${item.hora} <button class="btn-delete-item" onclick="excluirItem('${key}')">✖</button>
                        </td>
                    </tr>`;
            }
        });

        // Desenha Ranking
        const ordenado = Object.entries(totais).sort((a,b) => b[1]-a[1]);
        if (ordenado.length > 0) {
            const max = ordenado[0][1];
            ordenado.forEach(([nome, total]) => {
                const perc = (total / max) * 100;
                let corBarra = total > 150 ? (total > 250 ? "#ef4444" : "#f59e0b") : "#22c55e";
                rankingDiv.innerHTML += `
                    <div class="ranking-bar">
                        <div style="display:flex; justify-content:space-between; font-size:13px;"><span>${nome}</span><b>${total.toFixed(1)}L</b></div>
                        <div class="bar-bg"><div class="bar-fill" style="width:${perc}%; background:${corBarra};"></div></div>
                    </div>`;
            });
        }
    });
}

// Inicia a escuta contínua
database.ref('historico_gasto').on('value', atualizarInterface);

function limparFiltroData() {
    document.getElementById("filtroCalendario").value = "";
    atualizarInterface();
}

function excluirItem(id) {
    if(confirm("Excluir este gasto?")) database.ref('historico_gasto/' + id).remove();
}

function limparHistoricoTotal() {
    if(confirm("⚠️ Isso zerará TODO o histórico. Confirmar?")) database.ref('historico_gasto').remove();
}

function verificarDispositivo() {
    const local = document.getElementById("dispositivoGasto").value;
    const nome = document.getElementById("nomePessoa");
    nome.placeholder = (local === "Máquina de Lavar" || local === "Torneira Geral") ? "Opcional" : "Nome da Pessoa";
}
