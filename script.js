/* ============================================================
   BLINK.BLINK — CÉREBRO (Firebase) + Fichas + Estrelas/Raios em pontas
============================================================ */

/* ---------- CONEXÃO ---------- */
var firebaseConfig = {
  apiKey: "AIzaSyCPzp6nH0tuLsBo4wQgcPFRbmWrhTUJNag",
  authDomain: "blink-blink-a9cd0.firebaseapp.com",
  databaseURL: "https://blink-blink-a9cd0-default-rtdb.firebaseio.com",
  projectId: "blink-blink-a9cd0",
  storageBucket: "blink-blink-a9cd0.firebasestorage.app",
  messagingSenderId: "736350140419",
  appId: "1:736350140419:web:5994e3bfc56bb9457ef636"
};
firebase.initializeApp(firebaseConfig);
var auth = firebase.auth();
var refEstrutura = firebase.database().ref('estrutura');
var refChamadas  = firebase.database().ref('chamadas');

var papel = null;
var db = { turmas:[], sessoes:{}, fichas:[] };
var abaAtiva = 'painel';
var dataAtual = hojeISO();
var carregouEstrutura = false, carregouChamadas = false;
var ordemPainel = 'freq';

/* ---------- SALVAR / CARREGAR ---------- */
function salvarEstrutura(){ refEstrutura.set({ turmas: db.turmas, fichas: db.fichas }); }
function salvarChamadas(){ refChamadas.set(db.sessoes); }

function ligarSincronizacao(){
  refEstrutura.on('value', function(snap){
    var v = snap.val();
    var turmas, fichas;
    if(Array.isArray(v)){ turmas = v; fichas = []; }
    else if(v && typeof v === 'object'){ turmas = v.turmas || []; fichas = v.fichas || []; }
    else { turmas = []; fichas = []; }
    turmas = turmas.filter(function(x){ return x; });
    turmas.forEach(function(t){
      if(!t.alunos) t.alunos = [];
      t.alunos = t.alunos.filter(function(a){ return a; });
    });
    db.turmas = turmas;
    db.fichas = (fichas||[]).filter(function(x){ return x; });
    carregouEstrutura = true;
    if(papel) desenhar();
  }, function(){ aviso('Erro ao ler turmas da nuvem.'); });

  refChamadas.on('value', function(snap){
    var s = snap.val() || {};
    Object.keys(s).forEach(function(k){ if(!s[k].presencas) s[k].presencas = {}; });
    db.sessoes = s;
    carregouChamadas = true;
    if(papel) desenhar();
  }, function(){ aviso('Erro ao ler chamadas da nuvem.'); });
}

/* ---------- FERRAMENTAS ---------- */
var DIAS = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
function novoId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function hojeISO(){ var d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
function dataBR(iso){ var p=iso.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
function diaNumero(iso){ return new Date(iso+'T12:00:00').getDay(); }
function diaDaSemana(iso){ return DIAS[diaNumero(iso)]; }
function ehFimDeSemana(iso){ var d=diaNumero(iso); return d===0 || d===6; }
function esc(t){ return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function aviso(t){ var e=document.getElementById('toast'); e.textContent=t; e.classList.add('show'); clearTimeout(e.timer); e.timer=setTimeout(function(){e.classList.remove('show');},4000); }
function aoTocar(el, fn){ if(!el) return; el.addEventListener('click', function(e){ e.preventDefault(); fn(); }); }
function ehProfessor(){ return papel==='professor'; }
function normNome(s){
  s=(s||'').toString().toLowerCase().trim();
  s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return s.replace(/\s+/g,' ');
}
function emOrdem(lista){
  return (lista || []).slice().sort(function(a, b){
    return (a.nome || '').localeCompare(b.nome || '', 'pt', { sensitivity:'base' });
  });
}
function chaveSessao(t,d){ return t+'|'+d; }
function pegarSessao(t,d){ return db.sessoes[chaveSessao(t,d)] || {tipo:'aula',motivo:'',presencas:{},concluida:false}; }

/* ---------- LOGIN ---------- */
function entrarComo(novoPapel){
  papel = novoPapel;
  document.getElementById('login').style.display='none';
  document.getElementById('app').style.display='block';
  var cracha=document.getElementById('crachaPapel');
  cracha.textContent = novoPapel==='professor' ? '🔑 Professor' : '👥 Aluno';
  cracha.className='cracha '+novoPapel;
  ['btnExcel','btnBackup','btnRestaurar'].forEach(function(id){
    document.getElementById(id).style.display = ehProfessor() ? '' : 'none';
  });
  abaAtiva='painel'; desenhar();
}
function sair(){
  if(ehProfessor()) auth.signOut();
  papel=null; abaAtiva='painel';
  document.getElementById('app').style.display='none';
  document.getElementById('login').style.display='flex';
  mostrarEscolha();
}
function mostrarEscolha(){
  document.getElementById('loginEscolha').style.display='block';
  document.getElementById('loginSenha').style.display='none';
  document.getElementById('senhaProf').value='';
  document.getElementById('emailProf').value='';
}
function mostrarSenha(){
  document.getElementById('loginEscolha').style.display='none';
  document.getElementById('loginSenha').style.display='block';
  document.getElementById('emailProf').focus();
}
function tentarProfessor(){
  var email = document.getElementById('emailProf').value.trim();
  var senha = document.getElementById('senhaProf').value;
  if(!email || !senha){ aviso('Preencha e-mail e senha.'); return; }
  auth.signInWithEmailAndPassword(email, senha)
    .then(function(){ entrarComo('professor'); })
    .catch(function(){ aviso('E-mail ou senha incorretos.'); });
}
aoTocar(document.getElementById('entrarAluno'), function(){ entrarComo('aluno'); });
aoTocar(document.getElementById('irProfessor'), mostrarSenha);
aoTocar(document.getElementById('voltarLogin'), mostrarEscolha);
aoTocar(document.getElementById('confirmaProf'), tentarProfessor);
document.getElementById('senhaProf').addEventListener('keydown', function(e){ if(e.key==='Enter') tentarProfessor(); });
document.getElementById('verSenha').addEventListener('click', function(){
  var i = document.getElementById('senhaProf');
  var mostrando = i.type === 'password';
  i.type = mostrando ? 'text' : 'password';
  var svg = document.getElementById('iconeOlho');
  svg.innerHTML = mostrando
    ? '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/><path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.39-1.61"/>'
    : '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>';
});

/* ---------- MODAL DE TEXTO ---------- */
var acaoDoModal=null;
function abrirModal(titulo, texto, aoConfirmar, valorInicial, ehSenha){
  document.getElementById('modalTitulo').textContent=titulo;
  document.getElementById('modalTexto').textContent=texto;
  var input=document.getElementById('modalInput');
  input.value=valorInicial||''; input.type = ehSenha ? 'password' : 'text';
  acaoDoModal=aoConfirmar;
  document.getElementById('modalFundo').classList.add('aberto'); input.focus(); input.select();
}
function fecharModal(){ document.getElementById('modalFundo').classList.remove('aberto'); acaoDoModal=null; }
function confirmarModal(){ var t=document.getElementById('modalInput').value.trim(); if(acaoDoModal){acaoDoModal(t);} fecharModal(); }
document.getElementById('modalInput').addEventListener('keydown', function(e){ if(e.key==='Enter')confirmarModal(); if(e.key==='Escape')fecharModal(); });

/* ---------- MODAL DE CONFIRMAÇÃO ---------- */
var acaoConfirmar=null;
function pedirConfirmacao(titulo, texto, aoConfirmar, textoBotao){
  document.getElementById('confTitulo').textContent=titulo;
  document.getElementById('confTexto').textContent=texto;
  document.getElementById('confOk').textContent=textoBotao||'Confirmar';
  acaoConfirmar=aoConfirmar;
  document.getElementById('confFundo').classList.add('aberto');
}
function fecharConfirmacao(){ document.getElementById('confFundo').classList.remove('aberto'); acaoConfirmar=null; }
function confirmarAcao(){ var fn=acaoConfirmar; fecharConfirmacao(); if(fn) fn(); }

/* ---------- MODAL DE FICHA (editar aluno vinculado) ---------- */
var fichaAlvo=null;
function abrirFicha(turmaId, alunoId){
  var turma=db.turmas.find(function(t){return t.id===turmaId;});
  var aluno=turma.alunos.find(function(a){return a.id===alunoId;});
  fichaAlvo={turmaId:turmaId, alunoId:alunoId};
  document.getElementById('fichaNome').textContent = aluno.nome + '  ·  ' + turma.nome;
  document.getElementById('fCompleto').value = aluno.nomeCompleto || '';
  document.getElementById('fEscola').value = aluno.escola || '';
  document.getElementById('fSerie').value  = aluno.serie  || '';
  document.getElementById('fTurno').value  = aluno.turno  || '';
  document.getElementById('fSexo').value   = aluno.sexo   || '';
  document.getElementById('fichaFundo').classList.add('aberto');
}
function fecharFicha(){ document.getElementById('fichaFundo').classList.remove('aberto'); fichaAlvo=null; }
function salvarFicha(){
  if(!ehProfessor() || !fichaAlvo) return;
  var turma=db.turmas.find(function(t){return t.id===fichaAlvo.turmaId;});
  var aluno=turma.alunos.find(function(a){return a.id===fichaAlvo.alunoId;});
  aluno.nomeCompleto=document.getElementById('fCompleto').value.trim();
  aluno.escola=document.getElementById('fEscola').value.trim();
  aluno.serie =document.getElementById('fSerie').value.trim();
  aluno.turno =document.getElementById('fTurno').value.trim();
  aluno.sexo  =document.getElementById('fSexo').value.trim();
  fecharFicha(); salvarEstrutura(); aviso('Ficha atualizada.');
}

/* ---------- MODAL DE VINCULAR FICHA ---------- */
var vincAlvo=null;
function abrirVinc(turmaId, alunoId){
  var turma=db.turmas.find(function(t){return t.id===turmaId;});
  var aluno=turma.alunos.find(function(a){return a.id===alunoId;});
  vincAlvo={turmaId:turmaId, alunoId:alunoId};
  document.getElementById('vincAluno').textContent = 'Escolha a ficha de: '+aluno.nome+' ('+turma.nome+')';
  document.getElementById('vincBusca').value='';
  document.getElementById('vincFundo').classList.add('aberto');
  desenharListaFichas('');
  document.getElementById('vincBusca').focus();
}
function fecharVinc(){ document.getElementById('vincFundo').classList.remove('aberto'); vincAlvo=null; }
function desenharListaFichas(filtro){
  var lista=document.getElementById('vincLista');
  var disp = db.fichas.filter(function(f){ return !f.usada; });
  var nf = normNome(filtro);
  if(nf) disp = disp.filter(function(f){ return normNome(f.nome).indexOf(nf)!==-1; });
  disp.sort(function(a,b){ return (a.nome||'').localeCompare(b.nome||'', 'pt', {sensitivity:'base'}); });
  if(disp.length===0){
    lista.innerHTML='<p style="color:var(--muted);font-size:13.5px;padding:10px 4px">Nenhuma ficha disponível'+(nf?' com esse nome':'')+'. Importe o CSV primeiro.</p>';
    return;
  }
  lista.innerHTML='';
  disp.forEach(function(f){
    var b=document.createElement('button');
    b.className='ficha-item';
    b.innerHTML='<b>'+esc(f.nome)+'</b><small>'+esc(f.escola||'—')+' · '+esc(f.serie||'—')+' · '+esc(f.turno||'—')+'</small>';
    aoTocar(b, function(){ escolherFicha(f.id); });
    lista.appendChild(b);
  });
}
document.getElementById('vincBusca').addEventListener('input', function(e){ desenharListaFichas(e.target.value); });
function escolherFicha(fichaId){
  if(!ehProfessor() || !vincAlvo) return;
  var f=db.fichas.find(function(x){return x.id===fichaId;});
  var turma=db.turmas.find(function(t){return t.id===vincAlvo.turmaId;});
  var aluno=turma.alunos.find(function(a){return a.id===vincAlvo.alunoId;});
  aluno.nomeCompleto=f.nome; aluno.escola=f.escola; aluno.serie=f.serie; aluno.turno=f.turno; aluno.sexo=f.sexo;
  aluno.fichaId=f.id;
  f.usada=true;
  fecharVinc(); salvarEstrutura(); aviso('Ficha vinculada a '+aluno.nome+'.');
}
function desvincular(turmaId, alunoId){
  if(!ehProfessor()) return;
  var turma=db.turmas.find(function(t){return t.id===turmaId;});
  var aluno=turma.alunos.find(function(a){return a.id===alunoId;});
  pedirConfirmacao('Desvincular ficha','A ficha de "'+(aluno.nomeCompleto||aluno.nome)+'" volta para as disponíveis e os dados dele saem daqui (o nome curto na chamada continua). Continuar?', function(){
    if(aluno.fichaId){ var f=db.fichas.find(function(x){return x.id===aluno.fichaId;}); if(f) f.usada=false; }
    delete aluno.nomeCompleto; delete aluno.escola; delete aluno.serie; delete aluno.turno; delete aluno.sexo; delete aluno.fichaId;
    salvarEstrutura(); aviso('Ficha desvinculada.');
  }, 'Desvincular');
}

/* ---------- ABAS ---------- */
function desenharAbas(){
  var barra=document.getElementById('tabs'); barra.innerHTML='';
  barra.appendChild(criarAba('painel','📊 Painel'));
  if(ehProfessor()) barra.appendChild(criarAba('alunos','👥 Alunos'));
  barra.appendChild(criarAba('estrelas','🌟 Estrelas e Raios'));
  db.turmas.forEach(function(t){ barra.appendChild(criarAba(t.id, esc(t.nome)+' <span class="count">'+t.alunos.length+'</span>')); });
  if(ehProfessor()){
    var add=document.createElement('button'); add.className='tab tab-add'; add.textContent='+ Turma';
    aoTocar(add, adicionarTurma); barra.appendChild(add);
  }
}
function criarAba(id, texto){
  var b=document.createElement('button'); b.className='tab'+(abaAtiva===id?' active':''); b.innerHTML=texto;
  aoTocar(b, function(){ abaAtiva=id; desenhar(); }); return b;
}

/* ---------- DESENHAR ---------- */
function desenhar(){
  desenharAbas();
  var tela=document.getElementById('view'); tela.innerHTML='';
  if(!carregouEstrutura || !carregouChamadas){ tela.innerHTML='<div class="panel" style="text-align:center;color:var(--muted)">Carregando dados da nuvem…</div>'; return; }
  if(abaAtiva==='painel'){ desenharPainel(tela); return; }
  if(abaAtiva==='alunos'){ if(ehProfessor()) desenharAlunos(tela); else { abaAtiva='painel'; desenhar(); } return; }
  if(abaAtiva==='estrelas'){ desenharEstrelas(tela); return; }
  var turma=db.turmas.find(function(t){ return t.id===abaAtiva; });
  if(!turma){ abaAtiva='painel'; return desenhar(); }
  desenharTurma(turma, tela);
}

/* ---------- ESTRELAS E RAIOS ---------- */
var ESTRELA_PEDACOS = 5;
var RAIO_PEDACOS = 3;

function ajustarEstrela(turmaId, alunoId, delta){
  if(!ehProfessor()) return;
  var turma=db.turmas.find(function(t){return t.id===turmaId;});
  var aluno=turma.alunos.find(function(a){return a.id===alunoId;});
  var v=(aluno.estrelas||0)+delta; if(v<0) v=0;
  aluno.estrelas=v; salvarEstrutura();
}
function ajustarRaio(turmaId, alunoId, delta){
  if(!ehProfessor()) return;
  var turma=db.turmas.find(function(t){return t.id===turmaId;});
  var aluno=turma.alunos.find(function(a){return a.id===alunoId;});
  var v=(aluno.raios||0)+delta; if(v<0) v=0;
  aluno.raios=v; salvarEstrutura();
}
/* pontas da estrela (5 peças) + contorno */
var ESTRELA_PONTAS = [
  "M12.00 12.00 L9.30 8.28 L12.00 1.50 L14.70 8.28 Z",
  "M12.00 12.00 L14.70 8.28 L21.99 8.76 L16.37 13.42 Z",
  "M12.00 12.00 L16.37 13.42 L18.17 20.49 L12.00 16.60 Z",
  "M12.00 12.00 L12.00 16.60 L5.83 20.49 L7.63 13.42 Z",
  "M12.00 12.00 L7.63 13.42 L2.01 8.76 L9.30 8.28 Z"
];
var ESTRELA_CONTORNO = "M12.00 1.50 L14.70 8.28 L21.99 8.76 L16.37 13.42 L18.17 20.49 L12.00 16.60 L5.83 20.49 L7.63 13.42 L2.01 8.76 L9.30 8.28 Z";
var PATH_RAIO = "M17.65 1.00 L9.95 1.15 L6.69 10.16 L9.31 10.80 L6.56 15.48 L8.77 16.19 L6.35 23.00 L14.89 14.89 L12.82 13.99 L17.27 8.75 L14.27 7.94 Z";
var RAIO_FAIXAS = [[15.67,23.0],[8.33,15.67],[1.0,8.33]]; // de baixo p/ cima

function svgEstrela(acesas){
  var s='<svg width="30" height="30" viewBox="0 0 24 24" style="vertical-align:middle">';
  for(var i=0;i<5;i++){
    var cor = i<acesas ? '#fbbf24' : '#e2e8f0';
    s+='<path d="'+ESTRELA_PONTAS[i]+'" fill="'+cor+'"/>';
  }
  s+='<path d="'+ESTRELA_CONTORNO+'" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-linejoin="round"/></svg>';
  return s;
}
function svgRaio(acesas){
  var uid = Math.random().toString(36).slice(2,7);
  var s='<svg width="30" height="30" viewBox="0 0 24 24" style="vertical-align:middle"><defs>';
  for(var i=0;i<3;i++){
    var top=RAIO_FAIXAS[i][0], bot=RAIO_FAIXAS[i][1];
    s+='<clipPath id="clp'+uid+i+'"><rect x="0" y="'+top+'" width="24" height="'+(bot-top)+'"/></clipPath>';
  }
  s+='</defs>';
  for(var j=0;j<3;j++){
    var cor = j<acesas ? '#f59e0b' : '#e2e8f0';
    s+='<path d="'+PATH_RAIO+'" fill="'+cor+'" clip-path="url(#clp'+uid+j+')"/>';
  }
  s+='<path d="'+PATH_RAIO+'" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-linejoin="round"/></svg>';
  return s;
}
function desenhoPecas(total, porInteiro, tipo){
  var inteiras = Math.floor(total/porInteiro);
  var resto = total%porInteiro;
  var umCheio = (tipo==='raio') ? svgRaio(porInteiro) : svgEstrela(porInteiro);
  var s='';
  if(inteiras>0){
    s += umCheio + '<span style="font-weight:700;color:var(--slate);font-size:14px;margin:0 6px 0 1px">x'+inteiras+'</span>';
  }
  s += (tipo==='raio') ? svgRaio(resto) : svgEstrela(resto);
  return s;
}
function textoPecas(total, porInteiro, nomeInt, nomePed){
  var inteiros=Math.floor(total/porInteiro), resto=total%porInteiro;
  var partes=[];
  if(inteiros>0) partes.push(inteiros+' '+nomeInt+(inteiros>1?'s':''));
  if(resto>0) partes.push(resto+' '+nomePed+(resto>1?'s':''));
  return partes.length? partes.join(' e ') : '0';
}

function desenharEstrelas(tela){
  var totalGeral=0; db.turmas.forEach(function(t){ totalGeral+=(t.alunos||[]).length; });

  var topo=document.createElement('div'); topo.className='panel';
  topo.innerHTML='<div class="panel-title">Estrelas e Raios</div>'+
    '<p style="font-size:13px;color:var(--muted);margin:0">🌟 1 estrela = 5 pontas · ⚡ 1 raio = 3 partes. '+
    (ehProfessor()?'Use os botões para adicionar ou tirar.':'Aqui você vê as estrelas e raios de cada aluno.')+'</p>';
  tela.appendChild(topo);

  if(totalGeral===0){
    var e=document.createElement('div'); e.className='panel';
    e.innerHTML='<div class="empty" style="padding:26px"><h3>Nenhum aluno ainda</h3><p>Adicione alunos nas turmas para dar estrelas e raios.</p></div>';
    tela.appendChild(e); return;
  }

  db.turmas.forEach(function(t){
    if(!(t.alunos||[]).length) return;
    var sec=document.createElement('div'); sec.className='panel';
    sec.innerHTML='<div class="panel-title">'+esc(t.nome)+' <span class="count">'+t.alunos.length+'</span></div>';
    var grade=document.createElement('div'); grade.className='sr-grid';
    emOrdem(t.alunos).forEach(function(a){
      grade.appendChild(cartaoEstrela(t, a));
    });
    sec.appendChild(grade);
    tela.appendChild(sec);
  });
}

function cartaoEstrela(turma, aluno){
  var estrelas=aluno.estrelas||0, raios=aluno.raios||0;
  var card=document.createElement('div'); card.className='sr-card';
  var nomeMostrar = aluno.nomeCompleto || aluno.nome;

  var html='<div class="sr-nome">'+esc(nomeMostrar)+'</div>';
  html+='<div class="sr-linha"><span class="sr-vis">'+desenhoPecas(estrelas,ESTRELA_PEDACOS,'estrela')+'</span>'+
        '<span class="sr-num">'+textoPecas(estrelas,ESTRELA_PEDACOS,'estrela','ponta')+'</span></div>';
  html+='<div class="sr-linha"><span class="sr-vis">'+desenhoPecas(raios,RAIO_PEDACOS,'raio')+'</span>'+
        '<span class="sr-num">'+textoPecas(raios,RAIO_PEDACOS,'raio','parte')+'</span></div>';
  card.innerHTML=html;

  if(ehProfessor()){
    var ctrl=document.createElement('div'); ctrl.className='sr-ctrl';
    ctrl.innerHTML=
      '<div class="sr-row"><span>🌟</span>'+
        '<button class="sr-b" data-k="ep-">− ponta</button>'+
        '<button class="sr-b" data-k="ep+">+ ponta</button>'+
        '<button class="sr-b forte" data-k="ei-">− estrela</button>'+
        '<button class="sr-b forte" data-k="ei+">+ estrela</button></div>'+
      '<div class="sr-row"><span>⚡</span>'+
        '<button class="sr-b" data-k="rp-">− parte</button>'+
        '<button class="sr-b" data-k="rp+">+ parte</button>'+
        '<button class="sr-b forte" data-k="ri-">− raio</button>'+
        '<button class="sr-b forte" data-k="ri+">+ raio</button></div>';
    card.appendChild(ctrl);
    ctrl.querySelectorAll('button.sr-b').forEach(function(b){
      aoTocar(b, function(){
        var k=b.getAttribute('data-k');
        if(k==='ep+') ajustarEstrela(turma.id,aluno.id,1);
        else if(k==='ep-') ajustarEstrela(turma.id,aluno.id,-1);
        else if(k==='ei+') ajustarEstrela(turma.id,aluno.id,ESTRELA_PEDACOS);
        else if(k==='ei-') ajustarEstrela(turma.id,aluno.id,-ESTRELA_PEDACOS);
        else if(k==='rp+') ajustarRaio(turma.id,aluno.id,1);
        else if(k==='rp-') ajustarRaio(turma.id,aluno.id,-1);
        else if(k==='ri+') ajustarRaio(turma.id,aluno.id,RAIO_PEDACOS);
        else if(k==='ri-') ajustarRaio(turma.id,aluno.id,-RAIO_PEDACOS);
      });
    });
  }
  return card;
}

/* ---------- ABA ALUNOS (só professor) ---------- */
function desenharAlunos(tela){
  var totalGeral=0; db.turmas.forEach(function(t){ totalGeral+=(t.alunos||[]).length; });
  var dispon = db.fichas.filter(function(f){ return !f.usada; }).length;

  var p=document.createElement('div'); p.className='panel';
  p.innerHTML='<div class="panel-title" style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap">'+
    '<span>Alunos ('+totalGeral+')</span>'+
    '<button class="btn primary sm" id="btnImportar" style="text-transform:none; letter-spacing:normal">⬆️ Importar planilha (CSV)</button></div>'+
    '<p style="font-size:13px;color:var(--muted);margin:0 0 4px"><b>'+dispon+'</b> ficha(s) disponível(is) para vincular. Toque em <b>📋 Vincular</b> no aluno e escolha a ficha dele.</p>';
  tela.appendChild(p);
  ligarBotaoImportar();

  if(totalGeral===0){
    var e=document.createElement('div'); e.className='panel';
    e.innerHTML='<div class="empty" style="padding:26px"><h3>Nenhum aluno cadastrado</h3><p>Crie as turmas e adicione os alunos (nome curto). Depois importe o CSV e vincule cada ficha.</p></div>';
    tela.appendChild(e);
    return;
  }

  db.turmas.forEach(function(t){
    if(!(t.alunos||[]).length) return;
    var sec=document.createElement('div'); sec.className='panel';
    sec.innerHTML='<div class="panel-title">'+esc(t.nome)+' <span class="count">'+t.alunos.length+'</span></div>';
    var tbl='<table class="mini"><thead><tr><th>Aluno</th><th>Escola</th><th>Série</th><th>Turno</th><th>Sexo</th><th></th></tr></thead><tbody>';
    emOrdem(t.alunos).forEach(function(a){
      var vinc = !!a.nomeCompleto;
      var nomeCol = vinc
        ? '<b>'+esc(a.nomeCompleto)+'</b><br><small style="color:var(--faint)">chamada: '+esc(a.nome)+'</small>'
        : '<b>'+esc(a.nome)+'</b><br><small style="color:var(--just)">sem ficha</small>';
      var acao = vinc
        ? '<button class="btn sm ed" data-t="'+t.id+'" data-a="'+a.id+'" style="padding:4px 9px">✏️</button> <button class="btn ghost sm dv" data-t="'+t.id+'" data-a="'+a.id+'" style="padding:4px 8px">🔗</button>'
        : '<button class="btn primary sm vl" data-t="'+t.id+'" data-a="'+a.id+'" style="padding:5px 10px; text-transform:none; letter-spacing:normal">📋 Vincular</button>';
      tbl+='<tr>'+
        '<td>'+nomeCol+'</td>'+
        '<td>'+(esc(a.escola)||'<span style="color:var(--faint)">—</span>')+'</td>'+
        '<td>'+(esc(a.serie)||'<span style="color:var(--faint)">—</span>')+'</td>'+
        '<td>'+(esc(a.turno)||'<span style="color:var(--faint)">—</span>')+'</td>'+
        '<td>'+(esc(a.sexo)||'<span style="color:var(--faint)">—</span>')+'</td>'+
        '<td style="white-space:nowrap">'+acao+'</td>'+
        '</tr>';
    });
    tbl+='</tbody></table>';
    var wrap=document.createElement('div'); wrap.style.overflowX='auto'; wrap.innerHTML=tbl;
    sec.appendChild(wrap);
    tela.appendChild(sec);
    wrap.querySelectorAll('button.vl').forEach(function(b){ aoTocar(b, function(){ abrirVinc(b.getAttribute('data-t'), b.getAttribute('data-a')); }); });
    wrap.querySelectorAll('button.ed').forEach(function(b){ aoTocar(b, function(){ abrirFicha(b.getAttribute('data-t'), b.getAttribute('data-a')); }); });
    wrap.querySelectorAll('button.dv').forEach(function(b){ aoTocar(b, function(){ desvincular(b.getAttribute('data-t'), b.getAttribute('data-a')); }); });
  });

  var dica=document.createElement('p'); dica.className='hint';
  dica.innerHTML='A chamada usa o nome curto; aqui aparece o nome completo da ficha vinculada. Dados sensíveis (endereço, telefone, condições) ficam só no seu Obsidian. O 🔗 desvincula e devolve a ficha às disponíveis.';
  tela.appendChild(dica);
}
function ligarBotaoImportar(){
  var b=document.getElementById('btnImportar');
  if(b) aoTocar(b, function(){ document.getElementById('arquivoCSV').click(); });
}

/* ---------- IMPORTAÇÃO DE CSV → prateleira de fichas ---------- */
function importarCSV(evento){
  if(!ehProfessor()) return;
  var f=evento.target.files[0]; if(!f) return;
  var leitor=new FileReader();
  leitor.onload=function(){
    try{
      var wb=XLSX.read(leitor.result, {type:'string'});
      var sheet=wb.Sheets[wb.SheetNames[0]];
      var linhas=XLSX.utils.sheet_to_json(sheet, {defval:''});
      pedirConfirmacao('Importar fichas',
        'Vou ler '+linhas.length+' linha(s) e guardar como fichas disponíveis (nome, escola, série, turno, sexo). Endereço/telefone/CPF são ignorados. Continuar?',
        function(){ processarImport(linhas); }, 'Importar');
    }catch(e){ aviso('Não consegui ler o arquivo. Confira se é um CSV válido.'); }
  };
  leitor.readAsText(f, 'UTF-8');
  evento.target.value='';
}
function pegaCampo(row, nomes){
  var chaves=Object.keys(row);
  for(var i=0;i<nomes.length;i++){
    for(var j=0;j<chaves.length;j++){
      if(normNome(chaves[j]).indexOf(normNome(nomes[i]))!==-1) return String(row[chaves[j]]).trim();
    }
  }
  return '';
}
function processarImport(linhas){
  var novas=0, repetidas=0;
  linhas.forEach(function(row){
    var nome = pegaCampo(row, ['Nome do Aluno','Nome Completo do Aluno','Nome']);
    if(!nome) return;
    var cn=normNome(nome);
    if(db.fichas.some(function(f){ return normNome(f.nome)===cn; })){ repetidas++; return; }
    db.fichas.push({
      id: novoId(),
      nome: nome,
      escola: pegaCampo(row, ['Escola']),
      serie:  pegaCampo(row, ['Série','Serie']),
      turno:  pegaCampo(row, ['Turno']),
      sexo:   pegaCampo(row, ['Sexo']),
      usada: false
    });
    novas++;
  });
  salvarEstrutura();
  abaAtiva='alunos'; desenhar();
  aviso('Importação: '+novas+' ficha(s) nova(s)'+(repetidas?', '+repetidas+' já existiam.':'.'));
}

/* ---------- PAINEL ---------- */
function desenharPainel(tela){
  if(db.turmas.length===0){
    if(ehProfessor()){
      tela.innerHTML='<div class="empty panel"><h3>Vamos começar 🤖</h3><p>Crie sua primeira turma para lançar a frequência.</p><button class="btn primary" id="btnPrimeiraTurma">+ Criar primeira turma</button></div>';
      aoTocar(document.getElementById('btnPrimeiraTurma'), adicionarTurma);
    }else{
      tela.innerHTML='<div class="empty panel"><h3>Nenhuma turma ainda 🤖</h3><p>Peça para um professor criar as turmas. Depois é só marcar a chamada por aqui.</p></div>';
    }
    return;
  }
  var est=estatisticas();
  var cards=document.createElement('div'); cards.className='cards';
  cards.innerHTML = cardNum(db.turmas.length,'Turmas')+cardNum(est.totalAlunos,'Alunos')+cardNum(est.diasAula,'Dias de aula')+
    '<div class="card"><div class="big" style="color:var(--brand)">'+est.freqGeral+'%</div><div class="lab">Frequência geral</div></div>';
  tela.appendChild(cards);

  var pf=document.createElement('div'); pf.className='panel';
  var rotuloOrdem = ordemPainel==='abc' ? '🔤 Ordem: A a Z' : '📉 Ordem: quem falta mais';
  pf.innerHTML='<div class="panel-title" style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap">'+
    '<span>Frequência por aluno</span>'+
    '<button class="btn sm" id="btnOrdem" style="text-transform:none; letter-spacing:normal">'+rotuloOrdem+'</button></div>';
  if(est.alunos.length===0){ pf.innerHTML+='<p style="color:var(--muted);font-size:14px">Lance ao menos uma aula para ver as porcentagens.</p>'; }
  else{
    var listaOrdenada = est.alunos.slice();
    if(ordemPainel==='abc'){ listaOrdenada.sort(function(a,b){ return (a.nome||'').localeCompare(b.nome||'', 'pt', {sensitivity:'base'}); }); }
    var bars=document.createElement('div'); bars.className='bars';
    listaOrdenada.forEach(function(a){
      var pct=a.pct==null?0:a.pct; var row=document.createElement('div'); row.className='barrow';
      row.innerHTML='<div class="nm" title="'+esc(a.nome)+'">'+esc(a.nome)+' <small>'+esc(a.turma)+'</small></div>'+
        '<div class="track"><div class="fill'+(pct<75?' low':'')+'" style="width:'+pct+'%"></div></div>'+
        '<div class="pct">'+(a.pct==null?'—':pct+'%')+'</div>';
      bars.appendChild(row);
    });
    pf.appendChild(bars);
  }
  tela.appendChild(pf);
  var botaoOrdem = document.getElementById('btnOrdem');
  if(botaoOrdem) aoTocar(botaoOrdem, function(){ ordemPainel = ordemPainel==='abc' ? 'freq' : 'abc'; desenhar(); });

  var pd=document.createElement('div'); pd.className='panel';
  pd.innerHTML='<div class="panel-title">Dias sem aula (feriados e cancelamentos)</div>';
  if(est.diasSemAula.length===0){ pd.innerHTML+='<p style="color:var(--muted);font-size:14px">Nenhum registrado.</p>'; }
  else{
    var h='<table class="mini"><thead><tr><th>Data</th><th>Turma</th><th>Tipo</th><th>Motivo</th></tr></thead><tbody>';
    est.diasSemAula.forEach(function(d){
      h+='<tr><td class="mono">'+dataBR(d.data)+'</td><td>'+esc(d.turma)+'</td><td><span class="tag '+d.tipo+'">'+(d.tipo==='feriado'?'Feriado':'Sem aula')+'</span></td><td>'+(esc(d.motivo)||'<span style="color:var(--faint)">—</span>')+'</td></tr>';
    });
    pd.innerHTML+=h+'</tbody></table>';
  }
  tela.appendChild(pd);
}
function cardNum(n,l){ return '<div class="card"><div class="big">'+n+'</div><div class="lab">'+l+'</div></div>'; }

function estatisticas(){
  var totalAlunos=0, diasAula=0, presencasTot=0, ocasioesTot=0, alunos=[], diasSemAula=[];
  db.turmas.forEach(function(t){ totalAlunos+=(t.alunos?t.alunos.length:0); });
  Object.keys(db.sessoes).forEach(function(k){
    var s=db.sessoes[k];
    if(s.tipo!=='aula'){
      var tid=k.split('|')[0], data=k.split('|')[1];
      var tt=db.turmas.find(function(x){return x.id===tid;});
      if(tt) diasSemAula.push({turma:tt.nome,data:data,tipo:s.tipo,motivo:s.motivo});
      return;
    }
    diasAula++;
    var pres=s.presencas||{};
    Object.keys(pres).forEach(function(aid){
      var st=pres[aid].status;
      if(st==='presente'){presencasTot++;ocasioesTot++;} else if(st==='falta'||st==='justificada'){ocasioesTot++;}
    });
  });
  db.turmas.forEach(function(t){
    emOrdem(t.alunos).forEach(function(a){
      var tot=0,pre=0;
      Object.keys(db.sessoes).forEach(function(k){
        if(k.split('|')[0]!==t.id) return; var s=db.sessoes[k]; if(s.tipo!=='aula') return;
        var st=((s.presencas||{})[a.id]||{}).status;
        if(st==='presente'){tot++;pre++;} else if(st==='falta'||st==='justificada'){tot++;}
      });
      alunos.push({nome:a.nome,turma:t.nome,pct: tot?Math.round(pre/tot*100):null});
    });
  });
  alunos.sort(function(a,b){ return (a.pct==null?101:a.pct)-(b.pct==null?101:b.pct); });
  diasSemAula.sort(function(a,b){ return b.data<a.data?-1:1; });
  return { totalAlunos:totalAlunos, diasAula:diasAula, freqGeral: ocasioesTot?Math.round(presencasTot/ocasioesTot*100):0, alunos:alunos, diasSemAula:diasSemAula };
}

/* ---------- TELA DA TURMA ---------- */
function desenharTurma(turma, tela){
  if(!turma.alunos) turma.alunos = [];
  var sessao=pegarSessao(turma.id, dataAtual);
  var fds=ehFimDeSemana(dataAtual);

  var barra=document.createElement('div'); barra.className='panel';
  barra.innerHTML='<div class="daybar">'+
    '<div class="field"><label>Data da aula</label><input type="date" id="inputData" value="'+dataAtual+'"><div class="weekday">'+diaDaSemana(dataAtual)+'</div></div>'+
    (fds?'':'<div class="field"><label>Este dia teve…</label><div class="seg" id="segTipo">'+
      '<button data-t="aula" class="'+(sessao.tipo==='aula'?'on':'')+'">Aula normal</button>'+
      '<button data-t="feriado" class="'+(sessao.tipo==='feriado'?'on':'')+'">Feriado</button>'+
      '<button data-t="sem_aula" class="'+(sessao.tipo==='sem_aula'?'on':'')+'">Sem aula</button></div></div>')+
    '</div>';
  tela.appendChild(barra);
  barra.querySelector('#inputData').addEventListener('change', function(e){ dataAtual=e.target.value; desenhar(); });
  if(!fds){ barra.querySelectorAll('#segTipo button').forEach(function(b){ aoTocar(b, function(){ definirTipoDia(turma.id, b.getAttribute('data-t')); }); }); }

  if(fds){
    var cx=document.createElement('div'); cx.className='panel';
    cx.innerHTML='<div class="noclass sem"><h3>🚫 Fim de semana</h3><p>Não há aula aos sábados e domingos, então a chamada fica desativada neste dia. Escolha uma data de segunda a sexta.</p></div>';
    tela.appendChild(cx); return;
  }

  if(sessao.tipo!=='aula'){
    var ehSem=sessao.tipo==='sem_aula';
    var caixa=document.createElement('div'); caixa.className='panel';
    caixa.innerHTML='<div class="noclass '+(ehSem?'sem':'')+'"><h3>'+(ehSem?'🚫 Não houve aula neste dia':'🎉 Feriado — sem aula')+'</h3>'+
      '<p>Registre o motivo. Isso fica salvo e não conta falta para nenhum aluno.</p>'+
      '<input type="text" id="motivoDia" placeholder="'+(ehSem?'Ex.: falta de energia, greve, aula cancelada…':'Ex.: Dia da Independência')+'" value="'+esc(sessao.motivo)+'"></div>';
    tela.appendChild(caixa);
    var inp=caixa.querySelector('#motivoDia');
    inp.addEventListener('change', function(){ var s=pegarSessao(turma.id,dataAtual); s.motivo=inp.value; db.sessoes[chaveSessao(turma.id,dataAtual)]=s; salvarChamadas(); });
    return;
  }

  if(sessao.concluida){
    var c2=contar(turma, sessao);
    var done=document.createElement('div'); done.className='panel';
    done.innerHTML='<div class="concluida"><div class="check">✅</div><h3>Chamada concluída</h3><p>'+esc(turma.nome)+' · '+dataBR(dataAtual)+'</p>'+
      '<div class="resumo-done"><div><b style="color:var(--ok)">'+c2.p+'</b><span>presentes</span></div>'+
      '<div><b style="color:var(--no)">'+c2.f+'</b><span>faltas</span></div>'+
      '<div><b style="color:var(--just)">'+c2.j+'</b><span>justificadas</span></div></div>'+
      '<button class="btn" id="btnReabrir" style="margin-top:18px">Reabrir chamada</button></div>';
    tela.appendChild(done);
    aoTocar(done.querySelector('#btnReabrir'), function(){ reabrirChamada(turma.id); });
    return;
  }

  var painel=document.createElement('div'); painel.className='panel';
  var c=contar(turma, sessao);
  painel.innerHTML='<div class="panel-title" style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap">'+
    '<span>Chamada · '+dataBR(dataAtual)+'</span><div class="summary">'+
    '<div class="stat p"><div class="n">'+c.p+'</div><div class="l">Presentes</div></div>'+
    '<div class="stat f"><div class="n">'+c.f+'</div><div class="l">Faltas</div></div>'+
    '<div class="stat j"><div class="n">'+c.j+'</div><div class="l">Justif.</div></div></div></div>';

  if(turma.alunos.length===0){
    painel.innerHTML+='<div class="empty" style="padding:30px"><h3>Nenhum aluno ainda</h3><p>'+(ehProfessor()?'Adicione os alunos abaixo.':'Peça a um professor para adicionar os alunos.')+'</p></div>';
  }else{
    var grade=document.createElement('div'); grade.className='roster';
    emOrdem(turma.alunos).forEach(function(al){ grade.appendChild(cartaoAluno(turma, al, sessao)); });
    painel.appendChild(grade);
  }

  var linha=document.createElement('div'); linha.className='btnrow';
  if(ehProfessor()){
    var btnAdd=document.createElement('button'); btnAdd.className='btn primary sm'; btnAdd.textContent='+ Adicionar aluno';
    aoTocar(btnAdd, function(){ adicionarAluno(turma.id); }); linha.appendChild(btnAdd);
  }
  if(turma.alunos.length>0 && (c.p+c.f+c.j)>0){
    var btnReset=document.createElement('button'); btnReset.className='btn sm'; btnReset.textContent='↺ Resetar todos';
    aoTocar(btnReset, function(){ resetarTodos(turma.id); }); linha.appendChild(btnReset);
  }
  if(ehProfessor()){
    var btnRen=document.createElement('button'); btnRen.className='btn sm'; btnRen.style.marginLeft='auto'; btnRen.textContent='✏️ Renomear turma';
    aoTocar(btnRen, function(){ renomearTurma(turma.id); }); linha.appendChild(btnRen);
    var btnDel=document.createElement('button'); btnDel.className='btn ghost sm'; btnDel.textContent='Excluir turma';
    aoTocar(btnDel, function(){ excluirTurma(turma.id); }); linha.appendChild(btnDel);
  }
  if(linha.children.length>0) painel.appendChild(linha);

  var faltamMarcar=turma.alunos.length-(c.p+c.f+c.j);
  var fim=document.createElement('div');
  fim.style.cssText='margin-top:16px; padding-top:16px; border-top:1px solid var(--line); display:flex; align-items:center; gap:12px; flex-wrap:wrap';
  var btnConcluir=document.createElement('button'); btnConcluir.className='btn primary'; btnConcluir.textContent='✅ Concluir chamada';
  aoTocar(btnConcluir, function(){ concluirChamada(turma.id); });
  fim.appendChild(btnConcluir);
  var av=document.createElement('span'); av.style.cssText='font-size:13px; color:var(--muted)';
  if(turma.alunos.length===0){ av.textContent='Adicione alunos para concluir.'; btnConcluir.disabled=true; btnConcluir.style.opacity=.5; }
  else if(faltamMarcar>0){ av.innerHTML='Faltam <b>'+faltamMarcar+'</b> aluno(s) sem marcar.'; }
  else{ av.innerHTML='<b style="color:var(--ok)">Todos marcados!</b> Pode concluir.'; }
  fim.appendChild(av);
  painel.appendChild(fim);

  var dica=document.createElement('p'); dica.className='hint';
  dica.innerHTML='Toque no cartão para alternar: <b style="color:var(--ok)">✓ presente</b> → <b style="color:var(--just)">! justificada</b> → <b style="color:var(--no)">✗ falta</b>. Use <b>↺</b> para limpar um aluno.';
  painel.appendChild(dica);

  tela.appendChild(painel);
}

function cartaoAluno(turma, aluno, sessao){
  var pres=sessao.presencas||{};
  var rec=pres[aluno.id]||{}; var status=rec.status||null;
  var card=document.createElement('div'); card.className='student'+(status?' '+status:'');
  var nome=document.createElement('div'); nome.className='st-name'; nome.innerHTML=esc(aluno.nome)+'<span class="dot"></span>'; card.appendChild(nome);
  var cy=document.createElement('button'); cy.className='st-cycle';
  cy.textContent = status==='presente'?'✓ Presente':status==='justificada'?'! Justificada':status==='falta'?'✗ Falta':'Toque para marcar';
  aoTocar(cy, function(){ ciclar(turma.id, aluno.id); }); card.appendChild(cy);
  var foot=document.createElement('div'); foot.className='st-foot';
  if(status==='justificada'){
    var bm=document.createElement('button'); bm.className='st-motivo';
    bm.textContent=rec.motivo?('✏️ '+rec.motivo):'✏️ Adicionar motivo';
    aoTocar(bm, function(){ pedirMotivo(turma.id, aluno.id); }); foot.appendChild(bm);
  }else{ var vz=document.createElement('div'); vz.style.flex='1'; foot.appendChild(vz); }
  if(status){
    var bl=document.createElement('button'); bl.className='st-clear'; bl.textContent='↺'; bl.title='Voltar ao neutro';
    aoTocar(bl, function(){ limpar(turma.id, aluno.id); }); foot.appendChild(bl);
  }
  if(ehProfessor()){
    var bren=document.createElement('button'); bren.className='st-clear'; bren.textContent='✏️'; bren.title='Renomear aluno';
    aoTocar(bren, function(){ renomearAluno(turma.id, aluno.id); }); foot.appendChild(bren);
    var bk=document.createElement('button'); bk.className='st-kill2'; bk.textContent='×'; bk.title='Remover aluno';
    aoTocar(bk, function(){ removerAluno(turma.id, aluno.id); }); foot.appendChild(bk);
  }
  card.appendChild(foot);
  return card;
}

function contar(turma, sessao){
  var c={p:0,f:0,j:0}; var pres=sessao.presencas||{};
  (turma.alunos||[]).forEach(function(a){
    var s=(pres[a.id]||{}).status;
    if(s==='presente')c.p++; else if(s==='falta')c.f++; else if(s==='justificada')c.j++;
  });
  return c;
}

/* ---------- AÇÕES DE CHAMADA (todos podem) ---------- */
function definirTipoDia(turmaId, tipo){
  var chave=chaveSessao(turmaId,dataAtual); var sessao=pegarSessao(turmaId,dataAtual);
  sessao.tipo=tipo; db.sessoes[chave]=sessao; salvarChamadas();
}
function ciclar(turmaId, alunoId){
  var chave=chaveSessao(turmaId,dataAtual);
  var sessao=db.sessoes[chave]||{tipo:'aula',motivo:'',presencas:{},concluida:false};
  if(!sessao.presencas) sessao.presencas={};
  var atual=(sessao.presencas[alunoId]||{}).status||null;
  var prox = atual===null?'presente':atual==='presente'?'justificada':atual==='justificada'?'falta':'presente';
  sessao.presencas[alunoId]={status:prox, motivo:(sessao.presencas[alunoId]||{}).motivo||''};
  db.sessoes[chave]=sessao; salvarChamadas();
}
function limpar(turmaId, alunoId){
  var chave=chaveSessao(turmaId,dataAtual);
  var sessao=db.sessoes[chave]||{tipo:'aula',motivo:'',presencas:{},concluida:false};
  if(sessao.presencas) delete sessao.presencas[alunoId];
  db.sessoes[chave]=sessao; salvarChamadas();
}
function resetarTodos(turmaId){
  pedirConfirmacao('Resetar chamada do dia','Isso vai voltar todos os alunos ao estado neutro nesta data. A marcação deste dia será apagada.', function(){
    var chave=chaveSessao(turmaId,dataAtual);
    var sessao=db.sessoes[chave]||{tipo:'aula',motivo:'',presencas:{},concluida:false};
    sessao.presencas={}; db.sessoes[chave]=sessao; salvarChamadas(); aviso('Chamada do dia zerada.');
  }, 'Resetar');
}
function concluirChamada(turmaId){
  var turma=db.turmas.find(function(t){return t.id===turmaId;});
  var chave=chaveSessao(turmaId,dataAtual);
  var sessao=db.sessoes[chave]||{tipo:'aula',motivo:'',presencas:{},concluida:false};
  var c=contar(turma, sessao);
  var faltam=(turma.alunos||[]).length-(c.p+c.f+c.j);
  if((turma.alunos||[]).length===0){ aviso('Adicione alunos antes de concluir.'); return; }
  if(faltam>0){ aviso('Ainda faltam '+faltam+' aluno(s) sem marcar.'); return; }
  pedirConfirmacao('Concluir chamada','Confirmar a chamada de '+turma.nome+' em '+dataBR(dataAtual)+'? Você poderá reabrir depois se precisar.', function(){
    sessao.concluida=true; db.sessoes[chave]=sessao; salvarChamadas(); aviso('Chamada concluída! ✅');
  }, 'Concluir');
}
function reabrirChamada(turmaId){
  var chave=chaveSessao(turmaId,dataAtual);
  var sessao=db.sessoes[chave]||{tipo:'aula',motivo:'',presencas:{},concluida:false};
  sessao.concluida=false; db.sessoes[chave]=sessao; salvarChamadas();
}
function pedirMotivo(turmaId, alunoId){
  var chave=chaveSessao(turmaId,dataAtual);
  var sessao=db.sessoes[chave]||{tipo:'aula',motivo:'',presencas:{},concluida:false};
  if(!sessao.presencas) sessao.presencas={};
  var rec=sessao.presencas[alunoId]||{status:'justificada',motivo:''};
  abrirModal('Motivo da justificativa','Por que a falta deste aluno foi justificada? (pode deixar em branco)', function(texto){
    rec.status='justificada'; rec.motivo=texto; sessao.presencas[alunoId]=rec; db.sessoes[chave]=sessao; salvarChamadas();
  }, rec.motivo);
}

/* ---------- AÇÕES DE ESTRUTURA (só professor logado) ---------- */
function adicionarTurma(){
  if(!ehProfessor()) return;
  abrirModal('Nova turma','Dê um nome para a turma.', function(nome){
    if(!nome) return;
    db.turmas.push({id:novoId(),nome:nome,alunos:[]});
    abaAtiva=db.turmas[db.turmas.length-1].id; salvarEstrutura(); aviso('Turma criada.');
  });
}
function renomearTurma(turmaId){
  if(!ehProfessor()) return;
  var turma=db.turmas.find(function(t){return t.id===turmaId;});
  abrirModal('Renomear turma','Corrija o nome da turma.', function(nome){
    if(!nome) return;
    turma.nome=nome; salvarEstrutura(); aviso('Turma renomeada.');
  }, turma.nome);
}
function excluirTurma(turmaId){
  if(!ehProfessor()) return;
  var turma=db.turmas.find(function(t){return t.id===turmaId;});
  pedirConfirmacao('Excluir turma','A turma "'+turma.nome+'" será apagada. As chamadas antigas dela deixam de aparecer. Isso não pode ser desfeito.', function(){
    db.turmas=db.turmas.filter(function(t){return t.id!==turmaId;});
    abaAtiva='painel'; salvarEstrutura(); aviso('Turma excluída.');
  }, 'Excluir');
}
function adicionarAluno(turmaId){
  if(!ehProfessor()) return;
  abrirModal('Novo aluno','Nome curto (o que aparece na chamada).', function(nome){
    if(!nome) return;
    var turma=db.turmas.find(function(t){return t.id===turmaId;});
    if(!turma.alunos) turma.alunos=[];
    turma.alunos.push({id:novoId(),nome:nome}); salvarEstrutura();
  });
}
function renomearAluno(turmaId, alunoId){
  if(!ehProfessor()) return;
  var turma=db.turmas.find(function(t){return t.id===turmaId;});
  var aluno=turma.alunos.find(function(a){return a.id===alunoId;});
  abrirModal('Renomear aluno','Nome curto (o que aparece na chamada).', function(nome){
    if(!nome) return;
    aluno.nome=nome; salvarEstrutura(); aviso('Aluno renomeado.');
  }, aluno.nome);
}
function removerAluno(turmaId, alunoId){
  if(!ehProfessor()) return;
  var turma=db.turmas.find(function(t){return t.id===turmaId;});
  var aluno=turma.alunos.find(function(a){return a.id===alunoId;});
  pedirConfirmacao('Remover aluno','Remover "'+aluno.nome+'" da turma? Se tiver ficha vinculada, ela volta às disponíveis.', function(){
    if(aluno.fichaId){ var f=db.fichas.find(function(x){return x.id===aluno.fichaId;}); if(f) f.usada=false; }
    turma.alunos=turma.alunos.filter(function(a){return a.id!==alunoId;});
    salvarEstrutura(); aviso('Aluno removido.');
  }, 'Remover');
}

/* ---------- EXCEL / BACKUP / RESTAURAR ---------- */
function exportarExcel(){
  if(typeof XLSX==='undefined'){ aviso('A biblioteca do Excel não carregou (precisa de internet).'); return; }
  var traduz={presente:'Presente',falta:'Falta',justificada:'Falta justificada'};
  var registros=[['Turma','Data','Dia da semana','Tipo do dia','Motivo do dia','Aluno','Nome completo','Situação','Justificativa','Chamada concluída']];
  db.turmas.forEach(function(t){
    Object.keys(db.sessoes).forEach(function(k){
      if(k.split('|')[0]!==t.id) return;
      var data=k.split('|')[1]; var s=db.sessoes[k];
      if(s.tipo!=='aula'){ registros.push([t.nome,dataBR(data),diaDaSemana(data),s.tipo==='feriado'?'Feriado':'Sem aula',s.motivo||'','(dia sem aula)','','','','']); return; }
      emOrdem(t.alunos).forEach(function(a){
        var r=(s.presencas||{})[a.id]||{};
        registros.push([t.nome,dataBR(data),diaDaSemana(data),'Aula','',a.nome,a.nomeCompleto||'',traduz[r.status]||'Não registrado',r.motivo||'',s.concluida?'Sim':'Não']);
      });
    });
  });
  var resumo=[['Turma','Aluno','Nome completo','Dias de aula','Presenças','Faltas','Justificadas','% Presença','Estrelas (pedaços)','Raios (pedaços)']];
  db.turmas.forEach(function(t){
    emOrdem(t.alunos).forEach(function(a){
      var d=0,p=0,f=0,j=0;
      Object.keys(db.sessoes).forEach(function(k){
        if(k.split('|')[0]!==t.id) return; var s=db.sessoes[k]; if(s.tipo!=='aula') return;
        var st=((s.presencas||{})[a.id]||{}).status; if(!st) return; d++;
        if(st==='presente')p++; else if(st==='falta')f++; else if(st==='justificada')j++;
      });
      resumo.push([t.nome,a.nome,a.nomeCompleto||'',d,p,f,j,d?Math.round(p/d*100)+'%':'—',a.estrelas||0,a.raios||0]);
    });
  });
  var dias=[['Turma','Data','Dia da semana','Tipo','Motivo']];
  db.turmas.forEach(function(t){
    Object.keys(db.sessoes).forEach(function(k){
      if(k.split('|')[0]!==t.id) return; var s=db.sessoes[k]; if(s.tipo==='aula') return;
      var data=k.split('|')[1];
      dias.push([t.nome,dataBR(data),diaDaSemana(data),s.tipo==='feriado'?'Feriado':'Sem aula',s.motivo||'']);
    });
  });
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(registros),'Registros');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo),'Resumo por aluno');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dias),'Dias sem aula');
  XLSX.writeFile(wb, 'frequencia-robotica-'+hojeISO()+'.xlsx');
  aviso('Excel gerado! Confira sua pasta de downloads.');
}
function fazerBackup(){
  var tudo={turmas:db.turmas,sessoes:db.sessoes,fichas:db.fichas};
  var blob=new Blob([JSON.stringify(tudo,null,2)],{type:'application/json'});
  var link=document.createElement('a'); link.href=URL.createObjectURL(blob);
  link.download='backup-frequencia-'+hojeISO()+'.json'; link.click();
  aviso('Backup salvo. Guarde este arquivo em local seguro.');
}
function pedirSenhaBackup(){ fazerBackup(); }
function restaurar(evento){
  var arquivo=evento.target.files[0]; if(!arquivo) return;
  var leitor=new FileReader();
  leitor.onload=function(){
    try{
      var dados=JSON.parse(leitor.result);
      if(!dados.turmas||!dados.sessoes) throw new Error('formato');
      pedirConfirmacao('Restaurar backup','Isso vai substituir os dados da NUVEM pelos do arquivo escolhido. Continuar?', function(){
        db.turmas=dados.turmas; db.sessoes=dados.sessoes; db.fichas=dados.fichas||[];
        salvarEstrutura(); salvarChamadas(); aviso('Backup restaurado para a nuvem.');
      }, 'Restaurar');
    }catch(e){ aviso('Arquivo inválido. Selecione um backup .json gerado por este sistema.'); }
  };
  leitor.readAsText(arquivo); evento.target.value='';
}

/* ---------- LIGAR BOTÕES DO TOPO ---------- */
aoTocar(document.getElementById('btnExcel'), exportarExcel);
aoTocar(document.getElementById('btnBackup'), pedirSenhaBackup);
aoTocar(document.getElementById('btnRestaurar'), function(){ document.getElementById('arquivoRestaurar').click(); });
document.getElementById('arquivoRestaurar').addEventListener('change', restaurar);
document.getElementById('arquivoCSV').addEventListener('change', importarCSV);
aoTocar(document.getElementById('btnSair'), sair);

/* ---------- LIGA A NUVEM ---------- */
ligarSincronizacao();