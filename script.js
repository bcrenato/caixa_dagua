javascript
const firebaseConfig={
 apiKey:"SUA_API_KEY_FIREBASE",
 authDomain:"monitor-caixa-agua-ff63a.firebaseapp.com",
 databaseURL:"https://monitor-caixa-agua-ff63a-default-rtdb.firebaseio.com",
 projectId:"monitor-caixa-agua-ff63a",
 storageBucket:"monitor-caixa-agua-ff63a.firebasestorage.app",
 messagingSenderId:"176234978770",
 appId:"1:176234978770:web:e193d8242f4f111abd3c0b"
};

if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);

const database=firebase.database();

const AREA_UTIL=49,H_UTIL=75,R_BASE=58,R_TOPO=75.5;

let config={
 nivel_ligar:40,
 nivel_desligar:80
};

let nivelDestino=0,nivelAnim=0,grafico=null;

let consumoHoje=0,menorNivelHoje=null,ultimoLitros=null,tempoUltimaLeitura=0,dataAtual=new Date().toISOString().slice(0,10);

const LIMIAR=.5,MAX_QUEDA_POR_LEITURA=60;

const $=id=>document.getElementById(id);

function getDataHoje(){
  return new Date().toISOString().slice(0,10)
}

function litrosTronco(n){
  if(n<=0)return 0;
  const h=n/100*H_UTIL,
  r=R_BASE+(R_TOPO-R_BASE)*(h/H_UTIL);
  return Math.PI*h/3*(r*r+r*R_BASE+R_BASE*R_BASE)/1000
}


/* =========================================================
   CALIBRAÇÃO VISUAL DA ÁGUA
   ========================================================= */

function alturaAguaVisual(nivel){

  const pontos=[
    [0,config.tela0 ?? 0],
    [20,config.tela20 ?? 20],
    [40,config.tela40 ?? 40],
    [60,config.tela60 ?? 60],
    [80,config.tela80 ?? 80],
    [100,config.tela100 ?? 100]
  ];

  if(nivel<=0)return pontos[0][1];

  if(nivel>=100)return pontos[5][1];

  for(let i=1;i<pontos.length;i++){

    const [n1,v1]=pontos[i-1];
    const [n2,v2]=pontos[i];

    if(nivel<=n2){

      return v1+(nivel-n1)*(v2-v1)/(n2-n1);

    }
  }

  return 100;
}


/* =========================================================
   ANIMAÇÃO
   ========================================================= */

function animar(){

  nivelAnim+=(nivelDestino-nivelAnim)*.1;

  const visual=alturaAguaVisual(nivelAnim);

  if($('water')){
    $('water').style.height=Math.max(0,Math.min(100,visual))+'%';
  }

  if($('percent')){
    $('percent').innerText=nivelAnim.toFixed(0)+'%';
  }

  requestAnimationFrame(animar);
}

requestAnimationFrame(animar);


function atualizarInterface(nivel,litros){

  nivelDestino=nivel;

  if($('litrosText'))$('litrosText').innerText=Math.round(litros)+' L';

  processarConsumo(litros);

  const w=$('water'),
  s=$('status'),
  a=$('alertaGrande');

  if(!w||!s)return;

  if(nivel<=30){

    w.className='water low';
    s.innerText='MUITO CRÍTICO';

    if(a){
      a.innerText='🚨 PERIGO: CAIXA MUITO BAIXA!';
      a.style.display='block'
    }

  }else if(nivel<=config.nivel_ligar){

    w.className='water low';
    s.innerText='NÍVEL BAIXO';

    if(a){
      a.innerText='⚠️ BOMBA: NÍVEL PARA LIGAR';
      a.style.display='block'
    }

  }else if(nivel>=80){

    w.className='water';
    s.innerText='CAIXA CHEIA';

    if(a){
      a.innerText='⛔ BOMBA: NÍVEL PARA DESLIGAR';
      a.style.display='block'
    }

  }else{

    w.className='water';
    s.innerText='Normal';

    if(a)a.style.display='none'
  }
}


function processarConsumo(litros){

  if(litros==null||litros<0||litros>1100)return;

  const now=Date.now();

  if(
    ultimoLitros!==null&&
    Math.abs(litros-ultimoLitros)>100&&
    now-tempoUltimaLeitura<5000
  )return;

  ultimoLitros=litros;
  tempoUltimaLeitura=now;

  if(menorNivelHoje===null){
    menorNivelHoje=litros;
    return
  }

  if(litros<menorNivelHoje){

    const dif=menorNivelHoje-litros;

    if(dif>MAX_QUEDA_POR_LEITURA)return;

    if(dif>LIMIAR){
      consumoHoje+=dif;
      atualizarConsumoHoje(consumoHoje)
    }

    menorNivelHoje=litros;

    database.ref('consumo/'+dataAtual).set({
      total:+consumoHoje.toFixed(2),
      menorNivel:+menorNivelHoje.toFixed(2),
      ultimaAtualizacao:Date.now()
    })
  }
}


function atualizarConsumoHoje(v){

  if($('gastoHoje'))$('gastoHoje').innerText=v.toFixed(1)+' L'

}


function atualizarBoia(id,v){

  const e=$(id);

  if(e)e.innerText=v?'🟢':'⚪'

}


function atualizarAutomacao(d){

  if($('statusBomba'))
    $('statusBomba').innerText=d.status_bomba?'🟢 LIGADA':'🔴 DESLIGADA';

  if($('modoAutomacao'))
    $('modoAutomacao').innerText=d.modo_manual?'MANUAL':'AUTOMÁTICO';

  if($('statusSonoff'))
    $('statusSonoff').innerText=d.sonoff_online?'🟢 ONLINE':'🔴 OFFLINE';

  if($('wifiRssi'))
    $('wifiRssi').innerText=d.dispositivo?.rssi!=null?d.dispositivo.rssi+' dBm':'-';

  if($('sistemaSeguro'))
    $('sistemaSeguro').innerText=d.sistema_seguro?'🟢 NORMAL':'🚨 FALHA';

  if($('ultimoEvento'))
    $('ultimoEvento').innerText=d.ultimo_evento||'-';

  ['20','40','60','80'].forEach(x=>
    atualizarBoia('boia'+x,d.boias?.[x])
  )
}


database.ref('/').on('value',s=>{

  const d=s.val();

  if(!d)return;

  if(d.configuracao)
    config=Object.assign(config,d.configuracao);

  if(d.nivel!==undefined)
    atualizarInterface(
      +d.nivel,
      +d.litros||litrosTronco(+d.nivel)
    );

  atualizarAutomacao(d)

});


database.ref('configuracao').on('value',s=>{

  if(s.exists())
    config=Object.assign(config,s.val())

});


function comandoBomba(cmd){

  if(!confirm(
    cmd==='ON'
      ?'Ligar a bomba?'
      :'Desligar a bomba?'
  ))return;

  database.ref('comandos/bomba').set(cmd)
    .then(()=>
      alert('Comando enviado ao ESP8266.')
    )
}


function comandoModo(modo){

  database.ref('comandos/modo').set(modo)
    .then(()=>
      alert('Modo '+modo+' enviado ao ESP8266.')
    )

}


function iniciarGrafico(){

  const c=$('graficoConsumo')?.getContext('2d');

  if(!c)return;

  grafico=new Chart(c,{
    type:'line',
    data:{
      labels:[],
      datasets:[{
        label:'Litros por dia',
        data:[],
        tension:.3
      }]
    },
    options:{
      responsive:true,
      animation:false
    }
  })
}


function escutarGrafico(){

  database.ref('consumo').on('value',s=>{

    const d=s.val();

    if(!d||!grafico)return;

    const labels=[],
    val=[];

    Object.keys(d).sort().forEach(k=>{

      labels.push(
        k.split('-').reverse().join('/')
      );

      val.push(d[k].total||0)

    });

    grafico.data.labels=labels;
    grafico.data.datasets[0].data=val;
    grafico.update()

  })

}


iniciarGrafico();

escutarGrafico();


database.ref('consumo/'+dataAtual).once('value')
.then(s=>{

  if(s.exists()){

    const d=s.val();

    consumoHoje=d.total||0;

    menorNivelHoje=d.menorNivel??null;

    atualizarConsumoHoje(consumoHoje)

  }

});


setInterval(()=>{

  const n=getDataHoje();

  if(n!==dataAtual){

    dataAtual=n;

    consumoHoje=0;

    menorNivelHoje=null;

    ultimoLitros=null;

    atualizarConsumoHoje(0)

  }

},60000);

