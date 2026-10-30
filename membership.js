'use strict';
/* Contas e ranking. A cobrança automática não está habilitada. */
(()=>{
 const $=id=>document.getElementById(id);
 const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x;};
 const planLabel={free:'Grátis',bronze:'Bronze',prata:'Prata',ouro:'Ouro'};
 const modeLabel={easy:'Fácil',medium:'Médio',hard:'Difícil'};
 const phaseLabel=['Hiragana 1','Hiragana 2','Katakana 1','Katakana 2'];
 const api=async(url,data,method)=>{
  let response;
  try{response=await fetch(url,{method:method||(data===undefined?'GET':'POST'),headers:data===undefined?{}:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',...(data===undefined?{}:{body:JSON.stringify(data)})});}
  catch{throw Error('Não foi possível conectar ao servidor. O jogo continua disponível sem ranking.');}
  const ct=response.headers.get('content-type')||'';
  if(!ct.includes('application/json'))throw Error('O cadastro está indisponível: o site não está conectado ao servidor de contas. É necessário publicar o backend e configurar a rota /api no Netlify.');
  const result=await response.json().catch(()=>{throw Error('O servidor enviou uma resposta inválida. Verifique se a API foi publicada corretamente.');});
  if(!response.ok)throw Error(result.error||'Não foi possível concluir a operação.');
  return result;
 };
 let user=null,authMode='login',guestRemaining=5;
 function userName(){return user?.username||null;}
 function setAccountUI(){
  const free=user?.plan==='free';
  if($('free-counter-title')) $('free-counter-title').textContent=user?(free?`Você tem ${Math.max(0,16-(user.freeGamesUsed??0))} das 16 partidas grátis`:'🎮 Seu plano tem partidas ilimitadas'):guestRemaining>0?`🎮 ${guestRemaining} de 5 partidas disponíveis sem cadastro`:'🔐 Suas 5 partidas de visitante terminaram';
  if($('free-counter-detail'))$('free-counter-detail').textContent=user?(free?'Sua conta gratuita tem 16 partidas no total. Cada início ou reinício consome uma.':'Sua assinatura ativa permite jogar sem limite de partidas.'):(guestRemaining>0?'Jogue sem informar e-mail nem senha. Reiniciar ou iniciar outra fase também consome uma partida. Crie uma conta para receber mais 16 grátis.':'Crie uma conta para liberar 16 partidas gratuitas, salvar o progresso no ranking e participar dos desafios.');
  $('account-open').textContent=user?`👤 ${user.username}`:'Entrar / cadastrar';
  $('account-badge').textContent=user?`${user.username} • ${planLabel[user.plan]}`:'Visitante • sem ranking';
  $('rank-note').textContent=user?'Partidas concluídas com sua conta entram no ranking semanal. O plano não aumenta a pontuação.':'Você pode jogar 5 partidas sem conta, mas apenas partidas com login entram no ranking semanal.';
  $('profile-link').hidden=!user;
 }
 function modal(open){$('account-modal').hidden=!open;document.body.classList.toggle('modal-active',open);
  if(open){
   setTimeout(()=>(authMode==='login'?$('auth-email'):$('auth-username')).focus(),10);
   api('/api/health').then(()=>{}).catch(()=>message('Cadastro temporariamente indisponível. O servidor de contas precisa ser ativado na hospedagem.',true));
  }
 }
 function selectAuthMode(mode){authMode=mode;$('auth-login').hidden=mode!=='login';$('auth-signup').hidden=mode!=='signup';
  $('tab-login').setAttribute('aria-selected',String(mode==='login'));
  $('tab-signup').setAttribute('aria-selected',String(mode==='signup'));
  $('auth-feedback').textContent='';}
 function message(msg,isError=false){$('auth-feedback').textContent=msg;$('auth-feedback').classList.toggle('error',isError);}
 function status(msg,isError=false){$('plan-status').textContent=msg;$('plan-status').classList.toggle('error',isError);}
 async function refreshSession(){try{const d=await api('/api/me');user=d.user||null;guestRemaining=d.guestQuota?.remaining??5;}catch{user=null;}
  setAccountUI();return user;}
 async function submitAuth(mode,form){const submit=form.querySelector('button[type=submit]');submit.disabled=true;message('Verificando...');
  try{const data=Object.fromEntries(new FormData(form));const r=await api(mode==='signup'?'/api/signup':'/api/login',data);
   user=r.user;form.reset();setAccountUI();message('');modal(false);await refreshRanking();window.MJ?.refreshAcademy?.();}
  catch(e){message(e.message,true);}finally{submit.disabled=false;}
 }
 async function logout(){try{await api('/api/logout',{});}catch{}user=null;setAccountUI();modal(false);$('profile-panel').hidden=true;refreshRanking();window.MJ?.refreshAcademy?.();}
 async function refreshRanking(){const tbody=$('ranking-list');tbody.replaceChildren();
  const loading=el('p','ranking-empty','Atualizando classificação...');tbody.appendChild(loading);
  try{const d=await api('/api/ranking');tbody.replaceChildren();$('week-label').textContent=`Semana iniciada em ${d.weekStart.split('-').reverse().join('/')} • horário de Brasília/Bahia`;
   $('my-points').textContent=user?`${Number(d.myPoints||0).toLocaleString('pt-BR')} pontos nesta semana`:'Entre na sua conta para marcar pontos';
   if(!d.list.length){tbody.appendChild(el('p','ranking-empty','🌸 Ainda não há resultados nesta semana. Seja o primeiro!'));return;}
   d.list.forEach((p,index)=>{const row=el('div','rank-row');const medal=el('span','rank-position',index===0?'🥇':index===1?'🥈':index===2?'🥉':`#${index+1}`);
    const info=el('div','rank-player');info.appendChild(el('strong','',p.username));info.appendChild(el('small','',`${planLabel[p.plan]||'Grátis'} • ${p.performances} melhores resultados`));
    row.append(medal,info,el('strong','rank-score',`${Number(p.points).toLocaleString('pt-BR')} pts`));tbody.appendChild(row);
   });
  }catch(e){tbody.replaceChildren(el('p','ranking-empty',e.message));}
 }
 async function refreshProfile(){if(!user)return;$('profile-panel').hidden=false;
  const place=$('history-list');place.replaceChildren(el('p','ranking-empty','Carregando seus resultados...'));$('detail-report').hidden=true;$('detail-report').replaceChildren();
  try{const d=await api('/api/my-stats');$('profile-title').textContent=`Painel de ${user.username} • ${planLabel[user.plan]}`;
   $('stat-games').textContent=String(d.counts.games);$('stat-total').textContent=Number(d.counts.totalPoints).toLocaleString('pt-BR');
   $('stat-record').textContent=d.counts.bestSeconds===null?'—':`${d.counts.bestSeconds}s`;
   $('history-caption').textContent=`Últimas ${d.historyLimit} partidas visíveis no seu plano.`;
   place.replaceChildren();if(!d.history.length){place.appendChild(el('p','ranking-empty','Você ainda não terminou nenhuma partida com a conta.'));return;}
   d.history.forEach(row=>{const item=el('div','history-row');item.appendChild(el('span','',`${modeLabel[row.mode]} • ${phaseLabel[row.phase]}`));
    item.appendChild(el('b','',`${Number(row.points).toLocaleString('pt-BR')} pts`));
    item.appendChild(el('small','',`${row.elapsed}s • ${row.tries} tentativas`));place.appendChild(item);});
   const extra=$('detail-report');
   if(d.byMode?.length){extra.hidden=false;extra.appendChild(el('h4','','📊 Relatório de desempenho por modo'));
     d.byMode.forEach(row=>{const it=el('div','history-row');it.append(el('span','',modeLabel[row.mode]),el('b','',`${row.partidas} partidas`),el('small','',`Média: ${row.mediaSegundos}s • Recorde: ${row.recorde} pts`));extra.appendChild(it);});}
   if(d.byPhase?.length){extra.hidden=false;extra.appendChild(el('h4','','👑 Resultados por fase'));
     d.byPhase.forEach(row=>{const it=el('div','history-row');it.append(el('span','',`${modeLabel[row.mode]} • ${phaseLabel[row.phase]}`),el('b','',`${row.partidas} partidas`),el('small','',`Recorde: ${row.recorde} pts`));extra.appendChild(it);});}
  }catch(e){place.replaceChildren(el('p','ranking-empty',e.message));}
 }
 async function showInterest(plan){if(!user){status('Entre na sua conta antes de registrar interesse no plano.',true);selectAuthMode('signup');modal(true);return;}
  try{const d=await api('/api/plan-interest',{plan});status(`${planLabel[plan]}: ${d.message}`);}catch(e){status(e.message,true);}
 }
 async function deleteAccount(){if(!user)return;
  const password=prompt('Excluir sua conta e todos os resultados? Digite a senha para confirmar. Esta ação é permanente.');if(password===null)return;
  if(!confirm('Confirma a exclusão definitiva da conta?'))return;
  try{await api('/api/delete-account',{password});user=null;setAccountUI();$('profile-panel').hidden=true;refreshRanking();alert('Conta e resultados excluídos.');}
  catch(e){alert(e.message);}
 }
 window.MJ={api,refreshRanking,refreshProfile,currentUser:()=>user,guestRemaining:()=>guestRemaining,openLogin:()=>{selectAuthMode('signup');modal(true);},refreshQuota:(remaining,remainingGuest)=>{
   if(user&&user.plan==='free'&&Number.isInteger(remaining))user.freeGamesUsed=16-remaining;
   if(!user&&Number.isInteger(remainingGuest))guestRemaining=remainingGuest;
   setAccountUI();
  },refreshAcademy:()=>{}};
 $('account-open').addEventListener('click',()=>{selectAuthMode('login');modal(true);});
 $('modal-close').addEventListener('click',()=>modal(false));
 $('account-modal').addEventListener('click',e=>{if(e.target.id==='account-modal')modal(false);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')modal(false);});
 $('tab-login').addEventListener('click',()=>selectAuthMode('login'));
 $('tab-signup').addEventListener('click',()=>selectAuthMode('signup'));
 $('auth-login').addEventListener('submit',e=>{e.preventDefault();submitAuth('login',e.currentTarget);});
 $('auth-signup').addEventListener('submit',e=>{e.preventDefault();submitAuth('signup',e.currentTarget);});
 $('refresh-ranking').addEventListener('click',refreshRanking);
 $('profile-link').addEventListener('click',async()=>{await refreshProfile();$('profile-panel').scrollIntoView({behavior:'smooth'});});
 $('logout-btn').addEventListener('click',logout);
 $('delete-account').addEventListener('click',deleteAccount);
 document.querySelectorAll('[data-interest]').forEach(b=>b.addEventListener('click',()=>showInterest(b.dataset.interest)));
 refreshSession().then(()=>{refreshRanking();window.MJ?.refreshAcademy?.();});
})();
