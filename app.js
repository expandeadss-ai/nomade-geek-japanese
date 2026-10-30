'use strict';

// Os 46 caracteres básicos de hiragana e katakana, com sua leitura em romaji.
const KANA = [
  ['あ','ア','a'],['い','イ','i'],['う','ウ','u'],['え','エ','e'],['お','オ','o'],
  ['か','カ','ka'],['き','キ','ki'],['く','ク','ku'],['け','ケ','ke'],['こ','コ','ko'],
  ['さ','サ','sa'],['し','シ','shi'],['す','ス','su'],['せ','セ','se'],['そ','ソ','so'],
  ['た','タ','ta'],['ち','チ','chi'],['つ','ツ','tsu'],['て','テ','te'],['と','ト','to'],
  ['な','ナ','na'],['に','ニ','ni'],['ぬ','ヌ','nu'],['ね','ネ','ne'],['の','ノ','no'],
  ['は','ハ','ha'],['ひ','ヒ','hi'],['ふ','フ','fu'],['へ','ヘ','he'],['ほ','ホ','ho'],
  ['ま','マ','ma'],['み','ミ','mi'],['む','ム','mu'],['め','メ','me'],['も','モ','mo'],
  ['や','ヤ','ya'],['ゆ','ユ','yu'],['よ','ヨ','yo'],['ら','ラ','ra'],['り','リ','ri'],
  ['る','ル','ru'],['れ','レ','re'],['ろ','ロ','ro'],['わ','ワ','wa'],['を','ヲ','wo'],['ん','ン','n']
];
const PHASES = [
  { name:'Hiragana • Parte 1', subtitle:'Vogais e primeiras sílabas', alphabet:'Hiragana', column:0, indices:Array.from({length:24},(_,i)=>i) },
  { name:'Hiragana • Parte 2', subtitle:'Complete o hiragana básico', alphabet:'Hiragana', column:0, indices:Array.from({length:24},(_,i)=>i+22) },
  { name:'Katakana • Parte 1', subtitle:'Comece o segundo alfabeto', alphabet:'Katakana', column:1, indices:Array.from({length:24},(_,i)=>i) },
  { name:'Katakana • Parte 2', subtitle:'Complete o katakana básico', alphabet:'Katakana', column:1, indices:Array.from({length:24},(_,i)=>i+22) }
];
const MODES = {
  easy: { title:'Fácil', pairs:8, instruction:'Encontre duas cartas iguais. Cada uma mostra o japonês e a leitura embaixo.', status:'Encontre duas cartas iguais, com japonês e leitura juntos.' },
  medium:{ title:'Médio', pairs:12, instruction:'Forme pares entre a letra japonesa e a leitura em romaji. Você tem uma dica de 3 segundos.', status:'Associe japonês e romaji. Você pode usar uma dica.' },
  hard: { title:'Difícil', pairs:24, instruction:'São 48 cartas! Associe caracteres japoneses e romaji, sem nenhuma dica.', status:'48 cartas, 24 pares: associe japonês e romaji sem dicas.' }
};
const $ = (id)=>document.getElementById(id);
const store = {
  get(key, fallback) { try { const v=localStorage.getItem('mj-3-'+key); return v===null?fallback:JSON.parse(v); } catch { return fallback; } },
  set(key, value){try{localStorage.setItem('mj-3-'+key, JSON.stringify(value));}catch{}}
};
let mode=Object.prototype.hasOwnProperty.call(MODES, store.get('mode','easy'))?store.get('mode','easy'):'easy';
const maxPhase=(n)=>Math.min(3,Math.max(0,Number(n)||0));
let unlocked=maxPhase(store.get('unlocked-'+mode,0));
let phase=Math.min(unlocked,maxPhase(store.get('phase-'+mode,0)));
let state='ready', deck=[], picked=[], matches=0, tries=0, elapsed=0, startTime=0, ticker=null, mismatchTimeout=null, hintTimeout=null, usedHint=false;
let audioContext=null, soundOn=Boolean(store.get('sound',true));
let onlineGameId=null,onlineBusy=false;

function shuffle(items){for(let i=items.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;}
function pad2(n){return String(n).padStart(2,'0');}
function timeString(seconds){return `${pad2(Math.floor(seconds/60))}:${pad2(seconds%60)}`;}
function currentTime(){return startTime?Math.floor((Date.now()-startTime)/1000):elapsed;}
function updateTimer(){if(state==='playing'||state==='preview')$('timer-display').textContent=timeString(currentTime());}
function stopTimer(){if(ticker!==null){clearInterval(ticker);ticker=null;}}
function startTimer(){if(startTime)return;startTime=Date.now();ticker=setInterval(updateTimer,300);}
function cancelPending(){if(mismatchTimeout!==null)clearTimeout(mismatchTimeout);if(hintTimeout!==null)clearTimeout(hintTimeout);mismatchTimeout=null;hintTimeout=null;stopTimer();}
function playTone(success){if(!soundOn)return;try{const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;audioContext=audioContext||new Ctx();const osc=audioContext.createOscillator(), vol=audioContext.createGain(), now=audioContext.currentTime;osc.type='sine';osc.frequency.setValueAtTime(success?660:280,now);osc.frequency.exponentialRampToValueAtTime(success?880:215,now+.12);vol.gain.setValueAtTime(.075,now);vol.gain.exponentialRampToValueAtTime(.001,now+.18);osc.connect(vol).connect(audioContext.destination);osc.start();osc.stop(now+.2);}catch{}}
function setupDeck(){
  const config=PHASES[phase], ids=mode==='hard'?[...config.indices]:shuffle([...config.indices]).slice(0,MODES[mode].pairs);
  deck=shuffle(ids.flatMap(id=>{
    const japanese=KANA[id][config.column], reading=KANA[id][2];
    if(mode==='easy')return [
      {pairId:id,side:'bilingual',japanese,reading,flipped:false,matched:false},
      {pairId:id,side:'bilingual',japanese,reading,flipped:false,matched:false}
    ];
    return [
      {pairId:id,side:'japanese',japanese,reading,flipped:false,matched:false},
      {pairId:id,side:'romaji',japanese,reading,flipped:false,matched:false}
    ];
  }));
}
function renderBoard(){
  const board=$('game-board');board.replaceChildren();board.dataset.mode=mode;
  const fragment=document.createDocumentFragment();
  deck.forEach((card,index)=>{
    const button=document.createElement('button');button.type='button';button.className='card';
    button.dataset.index=String(index);button.textContent='?';button.setAttribute('aria-label',`Carta ${index+1}, virada para baixo`);
    button.addEventListener('click',()=>flipCard(index));fragment.appendChild(button);
  });
  board.appendChild(fragment);
}
function setCardContents(element,card,open){
  element.replaceChildren();
  if(!open){element.textContent='?';return;}
  if(card.side==='bilingual'){
    const jp=document.createElement('span'), reading=document.createElement('span');
    jp.className='kana-char';jp.lang='ja';jp.textContent=card.japanese;
    reading.className='kana-reading';reading.textContent=card.reading;
    element.append(jp,reading);
  }else if(card.side==='japanese'){
    const jp=document.createElement('span');jp.lang='ja';jp.textContent=card.japanese;element.append(jp);
  }else element.textContent=card.reading;
}
function syncCard(index){
  const card=deck[index], el=$('game-board').children[index];
  const preview=state==='preview'&&!card.matched, open=card.flipped||card.matched||preview;
  el.classList.toggle('flipped',open&&!card.matched);
  el.classList.toggle('matched',card.matched);
  el.classList.toggle('previewed',preview);
  el.classList.toggle('romaji',open&&card.side==='romaji');
  el.classList.toggle('bilingual',open&&card.side==='bilingual');
  setCardContents(el,card,open);
  const reading=card.side==='bilingual'?`${card.japanese}, ${card.reading}`:card.side==='japanese'?card.japanese:card.reading;
  el.setAttribute('aria-label',open?`${reading}${card.matched?', par encontrado':''}`:`Carta ${index+1}, virada para baixo`);
  el.disabled=card.matched||preview;
}
function syncAllCards(){deck.forEach((_,index)=>syncCard(index));}
function updateStats(){
  const total=MODES[mode].pairs;
  $('matches-count').textContent=`${matches}/${total}`;
  $('tries-count').textContent=String(tries);
  $('game-progress').setAttribute('aria-valuemax',String(total));
  $('game-progress').setAttribute('aria-valuenow',String(matches));
  $('progress-fill').style.width=`${(matches/total)*100}%`;
}
function setStatus(message){$('status-text').textContent=message;}
function updateModeSelector(){
  Object.keys(MODES).forEach(id=>{$('mode-'+id).setAttribute('aria-pressed',String(mode===id));});
  $('start-title').textContent=`Modo ${MODES[mode].title} · ${MODES[mode].pairs} pares`;
  $('start-btn').textContent='Começar fase →';$('start-btn').dataset.limit='';
  $('start-description').textContent=MODES[mode].instruction;
  $('hint-btn').hidden=mode!=='medium';
  updateHintButton();
}
function updateHintButton(){const button=$('hint-btn');button.disabled=state!=='playing'||usedHint;button.textContent=usedHint?'✓ Dica utilizada':'🔍 Dica de 3 s';}
function setPhase(index){
  if(index<0||index>=PHASES.length||index>unlocked)return;
  cancelPending();onlineGameId=null;onlineBusy=false;phase=index;store.set('phase-'+mode,index);
  state='ready';matches=0;tries=0;elapsed=0;startTime=0;picked=[];usedHint=false;
  setupDeck();renderBoard();updateStats();$('timer-display').textContent='00:00';
  $('phase-title').textContent=PHASES[phase].name;
  $('phase-desc').textContent=`${PHASES[phase].subtitle} · Modo ${MODES[mode].title}`;
  $('start-overlay').hidden=false;$('win-overlay').hidden=true;
  updateModeSelector();renderPhases();updateBest();setStatus('Escolha o modo e comece quando quiser.');
}
function setMode(id){
  if(!Object.prototype.hasOwnProperty.call(MODES,id)||id===mode)return;
  mode=id;store.set('mode',id);unlocked=maxPhase(store.get('unlocked-'+mode,0));
  setPhase(Math.min(unlocked,maxPhase(store.get('phase-'+mode,0))));
}
function startGame(){
  cancelPending();onlineGameId=null;onlineBusy=false;state='playing';matches=0;tries=0;elapsed=0;startTime=0;picked=[];usedHint=false;
  setupDeck();renderBoard();updateStats();$('timer-display').textContent='00:00';
  $('start-overlay').hidden=true;$('win-overlay').hidden=true;
  // Convidados podem começar 5 partidas, sem cadastro. O servidor controla a cota.
  {
    state='loading';onlineBusy=true;setStatus('🎮 Preparando sua partida...');updateHintButton();
    window.MJ.api('/api/game/start',{mode,phase}).then(data=>{
      if(state!=='loading')return;
      onlineGameId=data.gameId;window.MJ?.refreshQuota?.(data.remaining,data.guestRemaining); 
      deck=Array.from({length:data.cardCount},()=>({pairId:-1,side:'hidden',japanese:'',reading:'',flipped:false,matched:false}));
      state='playing';onlineBusy=false;renderBoard();updateStats();setStatus(data.ranked?'🏆 Partida oficial! Suas jogadas valem pontos no ranking.':'🎮 Partida de visitante! Cadastre-se para participar do ranking.');updateHintButton();
    }).catch(error=>{
      if(state!=='loading')return;
      onlineBusy=false;onlineGameId=null;
      state='ready';$('start-overlay').hidden=false;
      setStatus('⚠️ '+error.message);$('start-description').textContent=error.message;
      if(/5 partidas sem cadastro/.test(error.message)){
        window.MJ?.refreshQuota?.(null,0);
        $('start-btn').textContent='Criar conta e continuar 🔐';$('start-btn').dataset.limit='guest';
      }else if(/16 partidas/.test(error.message)){
        $('start-btn').textContent='Ver planos ↓';$('start-btn').dataset.limit='plan';
      }
      updateHintButton();
    });
  }
}
async function remoteFlip(index){
  if(onlineBusy||picked.length>=2||state!=='playing')return;
  const card=deck[index];if(!card||card.flipped||card.matched)return;
  onlineBusy=true;
  try{
    const data=await window.MJ.api('/api/game/flip',{gameId:onlineGameId,index});
    startTimer();Object.assign(deck[index],data.card,{flipped:true});
    syncCard(index);picked.push(index);
    if(picked.length===2){
      tries=data.tries;matches=data.matches;updateStats();
      const first=picked[0],second=picked[1];
      if(data.matched){
        deck[first].matched=true;deck[second].matched=true;
        syncCard(first);syncCard(second);picked=[];playTone(true);
        setStatus(`${matches} de ${MODES[mode].pairs} pares encontrados!`);
        if(data.complete){onlineGameId=null;completePhase(data.result);}
      }else{
        playTone(false);setStatus('Ainda não formou par. Tente outra combinação!');
        mismatchTimeout=setTimeout(()=>{
          deck[first].flipped=false;deck[second].flipped=false;
          syncCard(first);syncCard(second);picked=[];mismatchTimeout=null;updateHintButton();
        },950);
      }
    }
    if(picked.length===1)setStatus('Selecione a segunda carta.');
  }catch(error){setStatus('⚠️ '+error.message);if(/expirou|encerrada/.test(error.message)){
     onlineGameId=null;cancelPending();setPhase(phase);setStatus('Sua partida expirou. Inicie outra rodada.');
   }}finally{onlineBusy=false;updateHintButton();}
}
function flipCard(index){
  if(onlineGameId){remoteFlip(index);return;}
  if(state!=='playing'||picked.length>=2)return;
  const card=deck[index];if(!card||card.flipped||card.matched)return;
  startTimer();card.flipped=true;syncCard(index);picked.push(index);
  if(picked.length!==2){updateHintButton();return;}
  tries++;updateStats();
  const [first,second]=picked,a=deck[first],b=deck[second];
  const matched=a.pairId===b.pairId&&(mode==='easy'||a.side!==b.side);
  if(matched){
    a.matched=true;b.matched=true;syncCard(first);syncCard(second);
    matches++;picked=[];playTone(true);updateStats();
    setStatus(`${matches} de ${MODES[mode].pairs} pares encontrados!`);
    if(matches===MODES[mode].pairs)completePhase();
  }else{
    playTone(false);setStatus('Ainda não formou par. Tente de novo!');
    mismatchTimeout=setTimeout(()=>{
      a.flipped=false;b.flipped=false;syncCard(first);syncCard(second);
      picked=[];mismatchTimeout=null;updateHintButton();
    },950);
  }
  updateHintButton();
}
function showHint(){
  if(mode!=='medium'||usedHint||state!=='playing')return;
  if(onlineGameId){remoteHint();return;}
  if(picked.length){setStatus('Feche a carta que você virou antes de usar a dica.');return;}
  usedHint=true;state='preview';syncAllCards();updateHintButton();setStatus('Memorize! Todas as cartas ficarão visíveis por 3 segundos.');
  hintTimeout=setTimeout(()=>{state='playing';hintTimeout=null;syncAllCards();setStatus('Agora encontre os pares que você memorizou!');updateHintButton();},3000);
}
async function remoteHint(){
  if(!onlineGameId||mode!=='medium'||usedHint||state!=='playing'||picked.length||onlineBusy)return;
  onlineBusy=true;
  try{
    const data=await window.MJ.api('/api/game/hint',{gameId:onlineGameId});
    usedHint=true;state='preview';
    data.cards.forEach(c=>Object.assign(deck[c.index],c));
    syncAllCards();updateHintButton();setStatus('Memorize! Você tem 3 segundos para ver as cartas.');
    hintTimeout=setTimeout(()=>{
      state='playing';hintTimeout=null;syncAllCards();setStatus('Encontre os pares que você memorizou!');updateHintButton();
    },3000);
  }catch(e){setStatus('⚠️ '+e.message);}finally{onlineBusy=false;updateHintButton();}
}
function completePhase(onlineResult=null){
  elapsed=currentTime();stopTimer();startTime=0;state='won';
  const key=`best-${mode}-${phase}`,previous=store.get(key,null);
  if(previous===null||elapsed<previous)store.set(key,elapsed);
  if(phase<3){unlocked=Math.max(unlocked,phase+1);store.set('unlocked-'+mode,unlocked);}
  const last=phase===3;
  $('win-title').textContent=last?'Você completou o modo! 🎌':'Fase concluída! 🌸';
  $('win-message').textContent=onlineResult?.ranked?`🏆 ${onlineResult.points.toLocaleString('pt-BR')} pontos registrados no ranking da semana!`:(last?`Você passou pelas quatro fases no modo ${MODES[mode].title}! Crie sua conta para participar do ranking.`:`Você acertou todos os ${MODES[mode].pairs} pares! Crie uma conta para participar do ranking.`);
  $('win-time').textContent=timeString(elapsed);$('win-tries').textContent=String(tries);$('win-accuracy').textContent=`${Math.round(MODES[mode].pairs/tries*100)}%`;
  const guestFinished=!window.MJ?.currentUser?.()&&window.MJ?.guestRemaining?.()===0;
  $('next-btn').dataset.guestLimit=guestFinished?'true':'';
  $('next-btn').textContent=guestFinished?'Criar conta e continuar 🔐':last?'Jogar novamente ↻':'Próxima fase →';
  $('win-overlay').hidden=false;setStatus('Parabéns, fase concluída!');renderPhases();updateBest();playTone(true);
  updateHintButton();
  if(onlineResult?.ranked){window.MJ?.refreshRanking?.();window.MJ?.refreshProfile?.();window.MJ?.refreshAcademy?.();}
}
function renderPhases(){
  const list=$('phase-list');list.replaceChildren();
  PHASES.forEach((config,index)=>{
    const button=document.createElement('button');button.type='button';button.className=`phase-item${index===phase?' current':''}`;
    button.disabled=index>unlocked;button.setAttribute('aria-current',index===phase?'step':'false');
    const icon=document.createElement('span');icon.className='phase-icon';icon.textContent=index>unlocked?'🔒':index===phase?'🌸':index<unlocked?'✓':'🎴';
    const meta=document.createElement('span');meta.className='phase-meta';
    const heading=document.createElement('b');heading.textContent=config.name;
    const detail=document.createElement('small');detail.textContent=index>unlocked?'Bloqueada':index===phase?'Fase selecionada':'Desbloqueada';
    meta.append(heading,detail);const arrow=document.createElement('span');arrow.className='phase-arrow';arrow.textContent='›';button.append(icon,meta,arrow);
    button.addEventListener('click',()=>setPhase(index));list.appendChild(button);
  });
}
function updateBest(){const best=store.get(`best-${mode}-${phase}`,null);$('best-time').textContent=best===null?'Ainda não registrado':timeString(best);$('best-caption').textContent=best===null?'Complete a fase para marcar seu recorde.':`Seu melhor tempo no ${MODES[mode].title} · ${PHASES[phase].name}.`;}
function syncSoundButton(){$('sound-toggle').textContent=soundOn?'🔊':'🔇';$('sound-toggle').setAttribute('aria-pressed',String(soundOn));$('sound-toggle').setAttribute('aria-label',soundOn?'Desativar som':'Ativar som');}
Object.keys(MODES).forEach(id=>$('mode-'+id).addEventListener('click',()=>setMode(id)));
$('start-btn').addEventListener('click',()=>{
  if($('start-btn').dataset.limit==='guest'){window.MJ?.openLogin?.();return;}
  if($('start-btn').dataset.limit==='plan'){location.hash='planos';return;}
  startGame();
});
$('restart-btn').addEventListener('click',startGame);
$('hint-btn').addEventListener('click',showHint);
$('next-btn').addEventListener('click',()=>{
  if($('next-btn').dataset.guestLimit==='true'){window.MJ?.openLogin?.();return;}
  if(phase===3){setPhase(0);startGame();}else{setPhase(phase+1);startGame();}
});
$('sound-toggle').addEventListener('click',()=>{soundOn=!soundOn;store.set('sound',soundOn);syncSoundButton();});
syncSoundButton();setPhase(phase);
// Remover service workers antigos para evitar páginas ou scripts desatualizados após publicar nova versão.
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.getRegistrations().then(list=>list.forEach(reg=>reg.unregister())).catch(()=>{}));
