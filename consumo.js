// CONFIGURAÇÕES DO FIREBASE (Use as mesmas do seu script.js)
const firebaseConfig = {
  apiKey: "AIzaSyCQipZjlc86GtZGx3_aoyCT-jDrZ1oYyYM",
  authDomain: "monitor-caixa-agua-ff63a.firebaseapp.com",
  databaseURL: "https://monitor-caixa-agua-ff63a-default-rtdb.firebaseio.com",
  projectId: "monitor-caixa-agua-ff63a"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let medindo = false;
let litrosNoInicio = 0;
let litrosAtuaisDoSensor = 0;

// Escuta os litros reais vindos do NodeMCU para o cálculo
database.ref('litros').on('value', (snapshot) => {
    litrosAtuaisDoSensor = parseFloat(snapshot.val()) || 0;
});

function toggleMedicao() {
    const btn = document.getElementById("btnMedir");
    const display = document.getElementById("displayConsumo");
    const nome = document.getElementById("nomePessoa");
    const local = document.getElementById("dispositivoGasto");

    if (!medindo) {
        if (!nome.value.trim()) { alert("Digite um nome!"); return; }
        medindo = true;
        litrosNoInicio = litrosAtuaisDoSensor; // Grava o volume no início
        btn.innerText = "PARAR E SALVAR";
        btn.style.background = "#ef4444";
        display.innerText = "Medindo...";
    } else {
        medindo = false;
        let gasto = Math.max(0, litrosNoInicio - litrosAtuaisDoSensor); // Calcula a diferença
        
        btn.innerText = "INICIAR MEDIÇÃO";
        btn.style.background = "#22c55e";
        display.innerText = gasto.toFixed(1) + " L";

        // Salva no Firebase
        database.ref('historico_gasto').push({
            pessoa: nome.value,
            dispositivo: local.value,
            gasto: gasto.toFixed(1),
            hora: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
            data: new Date().toLocaleDateString('pt-BR')
        });
        nome.value = "";
    }
}

// Atualiza Ranking e Tabela
database.ref('historico_gasto').on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    const registros = Object.values(data).reverse();
    const totais = {};
    const corpoTabela = document.getElementById("corpoTabela");
    const rankingDiv = document.getElementById("rankingConsumo");

    corpoTabela.innerHTML = "";
    rankingDiv.innerHTML = "";

    registros.forEach((item, index) => {
        // Soma para o ranking
        totais[item.pessoa] = (totais[item.pessoa] || 0) + parseFloat(item.gasto);
        
        // Alimenta a tabela (apenas os últimos 5)
        if(index < 5) {
            const cor = parseFloat(item.gasto) > 60 ? "#ff4d4d" : "#ffc107";
            corpoTabela.innerHTML += `<tr style="border-bottom: 1px solid #334155;"><td style="padding:10px; text-align:left;"><b>${item.pessoa}</b><br><small>${item.dispositivo}</small></td><td style="color:${cor}; font-weight:bold;">${item.gasto}L</td><td><small>${item.hora}</small></td></tr>`;
        }
    });

    // Desenha o Ranking
    const rankingOrdenado = Object.entries(totais).sort((a,b) => b[1] - a[1]);
    const maxVal = rankingOrdenado[0][1];
    rankingOrdenado.forEach(([nome, total]) => {
        const perc = (total / maxVal) * 100;
        const corB = total > 150 ? "#ef4444" : "#22c55e";
        rankingDiv.innerHTML += `<div class="ranking-bar"><div style="display:flex; justify-content:space-between;"><span>${nome}</span><b>${total.toFixed(1)}L</b></div><div class="bar-bg"><div class="bar-fill" style="width:${perc}%; background:${corB};"></div></div></div>`;
    });
});
