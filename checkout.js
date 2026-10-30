(()=>{
 'use strict';
 const plans={
  bronze:{name:'Bronze',price:20,ideal:'Para quem quer praticar hiragana e katakana sem limite de partidas.',intro:'Continue a praticar todos os dias: treine os kana, repita fases e mantenha uma rotina.',highlight:'Pratique sem contar partidas',description:'Repita exercícios e evolua no seu tempo, nos 3 modos de dificuldade.',features:[
   'Partidas ilimitadas nos modos Fácil, Médio e Difícil',
   '4 fases com hiragana e katakana em cada modo',
   'Revisão inteligente para praticar os kana',
   'Missões diárias, XP, conquistas e desafio de 7 dias',
   'Ranking semanal justo e histórico de 10 partidas']},
  prata:{name:'Prata',price:30,ideal:'Para quem quer sair das letras e começar a reconhecer palavras e sons.',intro:'Vá além das cartas: transforme o reconhecimento dos caracteres em vocabulário e escuta.',highlight:'Mais do que decorar: comece a reconhecer palavras',description:'Continue jogando e adicione atividades de áudio e vocabulário.',features:[
   'Tudo do Bronze, incluindo partidas ilimitadas',
   'Desafio de 100 palavras com ícones e significados',
   'Quiz de escuta e prática com voz do dispositivo',
   'Relatórios de desempenho por modo',
   'Histórico de até 50 partidas']},
  ouro:{name:'Ouro',price:40,ideal:'Para quem quer uma trilha introdutória mais completa, incluindo conteúdo de N5.',intro:'Junte memória, vocabulário, escuta e atividades introdutórias de japonês em uma única jornada.',highlight:'Sua jornada mais completa de japonês iniciante',description:'Além das partidas e do vocabulário, explore atividades de N5 e relatórios por fase.',features:[
   'Tudo do Prata, com partidas e revisão ilimitadas',
   'Trilha introdutória de japonês N5',
   'Frases originais em clima de anime',
   'Simulado semanal introdutório',
   'Histórico ampliado e relatório detalhado por fase',
   'Identificação Ouro no perfil']}
 };
 const $=id=>document.getElementById(id);
 const money=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const qs=new URLSearchParams(location.search);
 const requested=qs.get('plano');let current=Object.hasOwn(plans,requested)?requested:'prata';let busy=false;
 function showMessage(text,error=false){$('checkout-message').textContent=text;$('checkout-message').classList.toggle('error',error)}
 function render(){
  const p=plans[current];
  document.title=`Plano ${p.name} · Nômade Geek Japanese`;
  $('plan-intro').textContent=p.intro;
  $('benefit-highlight').textContent=p.highlight;
  $('benefit-description').textContent=p.description;
  $('feature-title').textContent=`O que vem no ${p.name}`;
  const ul=$('plan-features');ul.replaceChildren();for(const feature of p.features){const li=document.createElement('li');li.textContent=feature;ul.appendChild(li)}
  $('selected-plan').textContent=`PLANO ${p.name.toLocaleUpperCase('pt-BR')}`;
  $('price').textContent=`R$ ${p.price}`;
  $('subtotal').textContent=money(p.price);
  $('total').textContent=money(p.price);
  $('plan-ideal').textContent=p.ideal;
  $('checkout-cta').textContent=`✨ Registrar interesse no ${p.name}`;
  document.querySelectorAll('[data-select]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.select===current)));
  showMessage('');
 }
 function select(plan){if(!Object.hasOwn(plans,plan))return;current=plan;const u=new URL(location.href);u.searchParams.set('plano',plan);history.replaceState(null,'',u.pathname+u.search);render();}
 async function api(url,data){const r=await fetch(url,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined,credentials:'same-origin',cache:'no-store'});const ct=r.headers.get('content-type')||'';if(!ct.includes('application/json'))throw Error('O servidor de contas não está disponível.');const obj=await r.json();if(!r.ok)throw Error(obj.error||'Não foi possível registrar sua escolha.');return obj;}
 async function continueSignup(){
  if(busy)return;busy=true;const button=$('checkout-cta');button.disabled=true;button.textContent='Verificando sua conta...';showMessage('');
  try{
   const me=await api('/api/me');
   if(!me.user){
    const u=new URL('/',location.origin);u.searchParams.set('cadastro','1');u.searchParams.set('plano',current);
    location.assign(u.pathname+u.search+'#planos');return;
   }
   const d=await api('/api/plan-interest',{plan:current});
   showMessage(`✅ ${me.user.username}, seu interesse no ${plans[current].name} foi registrado. ${d.message}`);
   button.textContent='✓ Interesse registrado';
  }catch(e){showMessage(e.message,true);button.textContent=`✨ Registrar interesse no ${plans[current].name}`;}
  finally{busy=false;button.disabled=false;}
 }
 document.querySelectorAll('[data-select]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.select)));
 $('checkout-cta').addEventListener('click',continueSignup);
 render();
})();
