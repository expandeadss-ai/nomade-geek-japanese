'use strict';
/* Academia: interface conectada à API. Conteúdo premium verificado pelo servidor. */
(()=>{
 const $=id=>document.getElementById(id);
 const elem=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node;};
 const planLabel={free:'Grátis',bronze:'Bronze',prata:'Prata',ouro:'Ouro'};
 const emojiLevel={Iniciante:'🌱',Aprendiz:'⚔️',Ninja:'🥷',Mestre:'🐉'};
 let dashboard=null,quiz=null,waiting=false,nextQuestion=null;
 function renderCourses(courses){
  const grid=$('academy-courses');grid.replaceChildren();
  for(const c of courses){
    const card=elem('article','course-card'+(c.unlocked?'':' course-locked'));
    const icon=elem('span','course-icon',c.emoji);const head=elem('h4','',c.title);
    const subtitle=elem('p','',c.description);const badge=elem('span','course-badge',c.unlocked?'✓ Liberado':`🔒 ${planLabel[c.level]}`);
    const button=elem('button','button '+(c.unlocked?'button-primary':'button-ghost'),c.unlocked?'Começar treino →':'Ver plano →');button.type='button';
    button.addEventListener('click',()=>c.unlocked?startStudy(c.id):(location.hash='planos'));
    card.append(icon,head,subtitle,badge,button);grid.appendChild(card);
  }
 }
 function showGuest(){
   dashboard=null;
   $('academy-level').textContent='🌱 Iniciante';$('academy-username').textContent='Crie uma conta para começar sua jornada.';
   $('academy-xp').textContent='0 XP';$('academy-streak').textContent='🔥 0 dias seguidos';
   $('academy-missions').replaceChildren(elem('p','','Você terá missões diárias com um plano ativo.'));
   $('academy-week-challenge').textContent='7 dias de aprendizado, uma atividade por dia.';
   $('academy-weekly').textContent='🏆 Torneio semanal: conclua 3 partidas.';
   $('academy-plan-30').textContent='Hiragana, katakana, palavras e frases em 30 dias.';$('academy-roadmap').replaceChildren();
   $('academy-challenge-days').replaceChildren();$('academy-achievements').replaceChildren(elem('p','subtle-copy','Crie uma conta para desbloquear conquistas.'));
   renderCourses([
    {id:'kana',title:'Revisão de kana',level:'bronze',emoji:'🈁',description:'Treinos e revisão.',unlocked:false},
    {id:'vocab',title:'Vocabulário',level:'prata',emoji:'🖼️',description:'Palavras ilustradas.',unlocked:false},
    {id:'n5',title:'Trilha N5 introdutória',level:'ouro',emoji:'🇯🇵',description:'Fundamentos do idioma.',unlocked:false}
   ]);
 }
 async function refreshAcademy(){
  if(!window.MJ?.currentUser?.()){showGuest();return;}
  try{dashboard=await window.MJ.api('/api/dashboard');}
  catch(e){$('academy-username').textContent=e.message;return;}
  const d=dashboard,u=d.user;
  $('academy-level').textContent=`${emojiLevel[u.level]||'🌱'} ${u.level}`;
  $('academy-username').textContent=`${u.username} • ${planLabel[u.plan]}`;
  $('academy-xp').textContent=`${u.xp.toLocaleString('pt-BR')} XP`;
  $('academy-streak').textContent=`🔥 ${u.streak} dia(s) de sequência`;
  const list=$('academy-missions');list.replaceChildren();
  for(const m of d.daily.missions){const div=elem('div','mission-item'+(m.done?' mission-done':''));
   div.append(elem('span','',m.done?'✅':'⭕'),elem('span','',m.label),elem('b','',`${m.progress}/${m.target}`));list.appendChild(div);}
  $('academy-week-challenge').textContent=`Você fez atividades em ${d.challenge7.activeDays} dos últimos 7 dias e tem ${u.streak} dia(s) seguidos. Avance estudando todos os dias.`;
  const days=$('academy-challenge-days');days.replaceChildren();for(let i=0;i<7;i++){const item=elem('span',i<Math.min(7,d.challenge7.streak)?'challenge-hit':'',String(i+1));days.appendChild(item);}
  $('academy-weekly').textContent=`🏆 Torneio semanal: ${Math.min(d.weekly.games,3)}/3 partidas concluídas ${d.weekly.done?'• Conquista alcançada!':'• meta compartilhada'}.`;
  $('academy-plan-30').textContent=`Dia ${d.studyPlan.day} de 30 • ${d.study.wordsPracticed}/${d.study.wordsGoal} palavras praticadas no seu desafio de vocabulário.`;
  const roadmap=$('academy-roadmap');roadmap.replaceChildren();for(const phase of d.studyPlan.stages){roadmap.appendChild(elem('div','roadmap-phase',`${phase.days} • ${phase.name}`));}
  const ach=$('academy-achievements');ach.replaceChildren();for(const a of d.achievements){const item=elem('span','achievement '+(a.done?'unlocked':'locked'),`${a.icon} ${a.name}`);ach.appendChild(item);}
  renderCourses(d.courses);
 }
 async function startStudy(course){
  if(waiting)return;
  waiting=true;
  const area=$('study-stage');area.hidden=false;
  $('study-name').textContent='Preparando estudo...';$('study-result').textContent='';
  area.scrollIntoView({behavior:'smooth',block:'start'});
  try{const data=await window.MJ.api('/api/study/start',{course});quiz={...data,position:0};renderQuestion(data.question);}
  catch(e){$('study-result').textContent=e.message;area.hidden=true;alert(e.message);}
  finally{waiting=false;}
 }
 function renderQuestion(question){
  quiz.question=question;nextQuestion=null;
  $('study-name').textContent=quiz.title;
  $('study-count').textContent=`Questão ${quiz.position+1}/${quiz.total}`;
  $('study-progress').style.width=`${(quiz.position/quiz.total)*100}%`;
  $('study-prompt').textContent=question.prompt;
  $('study-result').textContent='Selecione uma resposta.';
  $('study-next').hidden=true;
  const speak=$('study-speak');speak.hidden=!question.speech;
  if(question.speech){speak.dataset.japanese=question.speech;}
  // No exercício de áudio, esconder a palavra japonesa até o usuário responder.
  if(quiz.course==='audio'){$('study-prompt').textContent='🎧 Ouça a palavra e escolha o significado correto.';}
  const answers=$('study-answers');answers.replaceChildren();
  question.options.forEach(answer=>{const b=elem('button','answer-btn',answer);b.type='button';b.addEventListener('click',()=>submitAnswer(answer));answers.appendChild(b);});
 }
 async function submitAnswer(answer){
  if(waiting||!quiz)return;waiting=true;
  document.querySelectorAll('.answer-btn').forEach(b=>b.disabled=true);
  try{
    const data=await window.MJ.api('/api/study/answer',{sessionId:quiz.sessionId,answer});
    $('study-result').textContent=data.correct?'✅ Resposta correta!':`📖 Resposta correta: ${data.answer}`;
    for(const b of document.querySelectorAll('.answer-btn')){if(b.textContent===data.answer)b.classList.add('right');else if(b.textContent===answer)b.classList.add('wrong');}
    quiz.position++;
    if(data.done){quiz.finished=true;quiz.result=data.result;
      $('study-next').hidden=false;$('study-next').textContent='Ver resultado 🎉';
    }else{nextQuestion=data.next;$('study-next').hidden=false;$('study-next').textContent='Próxima questão →';}
    $('study-progress').style.width=`${(quiz.position/quiz.total)*100}%`;
  }catch(e){$('study-result').textContent='⚠️ '+e.message;}
  finally{waiting=false;}
 }
 function showFinal(){if(!quiz?.result)return;
  $('study-count').textContent='Sessão concluída!';$('study-prompt').textContent=`🌸 ${quiz.result.correct}/${quiz.result.total} acertos`;
  $('study-result').textContent=`+${quiz.result.xp} XP • Nível: ${quiz.result.level}. Seus erros ajudam a personalizar a próxima revisão.`;
  $('study-answers').replaceChildren();$('study-next').hidden=true;$('study-speak').hidden=true;
  refreshAcademy();
 }
 $('study-next').addEventListener('click',()=>{if(quiz?.finished)showFinal();else if(nextQuestion)renderQuestion(nextQuestion);});
 $('study-close').addEventListener('click',()=>{$('study-stage').hidden=true;quiz=null;});
 $('study-speak').addEventListener('click',()=>{
   const utterance=$('study-speak').dataset.japanese;
   if(!('speechSynthesis' in window)){alert('Este navegador não tem recurso de voz japonesa.');return;}
   speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance(utterance);speech.lang='ja-JP';speech.rate=.8;
   const voice=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('ja'));
   if(voice)speech.voice=voice;
   speechSynthesis.speak(speech);
 });
 showGuest();
 if(window.MJ){window.MJ.refreshAcademy=refreshAcademy;refreshAcademy();}
})();
