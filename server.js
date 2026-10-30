'use strict';
/** Jogo da Memória Japonês v4 - backend Node 22+, sem dependências externas. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const ROOT = __dirname;
const {bank:studyBank,catalogs:studyCatalogs,randArray:mixStudies}=require('./learning-data');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
fs.mkdirSync(DATA_DIR, {recursive:true});
const db = new DatabaseSync(path.join(DATA_DIR,'jogo.sqlite'));
db.exec(`PRAGMA journal_mode=WAL;
 PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS users (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   username TEXT NOT NULL UNIQUE COLLATE NOCASE,
   email TEXT NOT NULL UNIQUE COLLATE NOCASE,
   salt TEXT NOT NULL, password_hash TEXT NOT NULL,
   plan TEXT NOT NULL DEFAULT 'free', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );
 CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS guest_plays (token_hash TEXT PRIMARY KEY, games_used INTEGER NOT NULL DEFAULT 0 CHECK(games_used BETWEEN 0 AND 5), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS scores (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
   week_start TEXT NOT NULL, mode TEXT NOT NULL, phase INTEGER NOT NULL,
   points INTEGER NOT NULL, elapsed INTEGER NOT NULL, tries INTEGER NOT NULL, recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY(user_id,week_start,mode,phase));
 CREATE TABLE IF NOT EXISTS matches (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
   week_start TEXT NOT NULL, mode TEXT NOT NULL, phase INTEGER NOT NULL, points INTEGER NOT NULL, elapsed INTEGER NOT NULL, tries INTEGER NOT NULL, recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(user_id,recorded_at DESC);
 CREATE TABLE IF NOT EXISTS interests (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
   plan TEXT NOT NULL, registered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS daily_activity (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
   day TEXT NOT NULL, games INTEGER NOT NULL DEFAULT 0, pairs INTEGER NOT NULL DEFAULT 0, studies INTEGER NOT NULL DEFAULT 0,
   PRIMARY KEY(user_id,day));
 CREATE TABLE IF NOT EXISTS study_attempts (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
   item_id TEXT NOT NULL, total INTEGER NOT NULL DEFAULT 0, mistakes INTEGER NOT NULL DEFAULT 0,
   PRIMARY KEY(user_id,item_id));
 CREATE TABLE IF NOT EXISTS study_results (id INTEGER PRIMARY KEY AUTOINCREMENT,
   user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
   course TEXT NOT NULL, correct INTEGER NOT NULL, questions INTEGER NOT NULL,
   day TEXT NOT NULL, xp INTEGER NOT NULL, recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE INDEX IF NOT EXISTS ix_study_user ON study_results(user_id,recorded_at DESC);

`);
// Migração compatível com bancos existentes, sem apagar cadastro e ranking.
const userCols=db.prepare('PRAGMA table_info(users)').all().map(r=>r.name);
for(const [col,definition] of Object.entries({free_games_used:'INTEGER NOT NULL DEFAULT 0',xp:'INTEGER NOT NULL DEFAULT 0',last_active:'TEXT',streak:'INTEGER NOT NULL DEFAULT 0'})){
 if(!userCols.includes(col))db.exec(`ALTER TABLE users ADD COLUMN ${col} ${definition}`);
}
// Migração inicial: partidas concluídas antes da V5 também ocupam parte do limite gratuito.
if(!userCols.includes('free_games_used'))db.exec(`UPDATE users SET free_games_used=(SELECT MIN(16,COUNT(*)) FROM matches m WHERE m.user_id=users.id) WHERE plan='free'`);
function dateLocal(){return new Date(Date.now()-3*3600*1000).toISOString().slice(0,10);}
function dayOffset(date,delta){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);}
function levelName(xp){return xp>=2400?'Mestre':xp>=1200?'Ninja':xp>=400?'Aprendiz':'Iniciante';}
function updateActivity(userId,games,pairs,studies,xp){
 const today=dateLocal();const u=db.prepare('SELECT last_active,streak FROM users WHERE id=?').get(userId);
 const streak=u.last_active===today?u.streak:u.last_active===dayOffset(today,-1)?u.streak+1:1;
 db.prepare('UPDATE users SET xp=xp+?, last_active=?,streak=? WHERE id=?').run(xp,today,streak,userId);
 db.prepare(`INSERT INTO daily_activity(user_id,day,games,pairs,studies) VALUES(?,?,?,?,?)
 ON CONFLICT(user_id,day) DO UPDATE SET games=games+excluded.games,pairs=pairs+excluded.pairs,studies=studies+excluded.studies`).run(userId,today,games,pairs,studies);
}
function getQuota(user){return {limit:FREE_LIMIT,used:user.plan==='free'?user.free_games_used:null,remaining:user.plan==='free'?Math.max(0,FREE_LIMIT-user.free_games_used):null,unlimited:user.plan!=='free'};}
function studioAccess(plan,course){const level=studyCatalogs[course]?.level;return level && LEVELS.indexOf(plan)>=LEVELS.indexOf(level);}
function studioView(q){return {id:q.id,unit:q.unit,prompt:q.prompt,options:q.options,speech:q.speech||null,emoji:q.emoji||null};}
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
{col:0,ids:Array.from({length:24},(_,i)=>i)},
{col:0,ids:Array.from({length:24},(_,i)=>i+22)},
{col:1,ids:Array.from({length:24},(_,i)=>i)},
{col:1,ids:Array.from({length:24},(_,i)=>i+22)}];
const MODES = { easy:8, medium:12, hard:24 };
const sessionGames = new Map();
const attempts = new Map();
const studySessions = new Map();
const FREE_LIMIT=16;
const GUEST_LIMIT=5;
const LEVELS=['free','bronze','prata','ouro'];
const TYPES = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.txt':'text/plain; charset=utf-8'};
const PORT = Number(process.env.PORT||3000);
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
function error(res,status,message){json(res,status,{error:message});}
function shuffle(items){for(let i=items.length-1;i>0;i--){const j=crypto.randomInt(i+1);[items[i],items[j]]=[items[j],items[i]];}return items;}
function weekStart(){const now=new Date(Date.now()-3*3600*1000);const weekday=(now.getUTCDay()+6)%7;now.setUTCDate(now.getUTCDate()-weekday);return now.toISOString().slice(0,10);}
function safeUser(u){return u?{id:u.id,username:u.username,plan:u.plan,freeGamesUsed:u.free_games_used??0,freeLimit:FREE_LIMIT,xp:u.xp??0,level:levelName(u.xp??0),streak:u.streak??0}:null;}
function guestQuota(guest){const used=guest?.games_used??0;return {limit:GUEST_LIMIT,used,remaining:Math.max(0,GUEST_LIMIT-used)};}
function cookieValue(req,name){return (req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1)||null;}
function getGuest(req){const token=cookieValue(req,'mj_guest');if(!token||!(/^[\w-]{30,100}$/.test(token)))return null;
 const tokenHash=digest(token);const row=db.prepare('SELECT token_hash,games_used FROM guest_plays WHERE token_hash=?').get(tokenHash);return row||null;}
function cookieSecure(req){return (req.headers['x-forwarded-proto']||'').split(',')[0].trim()==='https';}
function getGameOwner(req){const u=getAuth(req);if(u)return {key:'u:'+u.id,user:u};const g=getGuest(req);return g?{key:'g:'+g.token_hash,user:null}:null;}
function setGuestCookie(res,token,req){res.setHeader('Set-Cookie',`mj_guest=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${365*86400}${cookieSecure(req)?'; Secure':''}`);}
function digest(text){return crypto.createHash('sha256').update(text).digest('hex');}
function hashPassword(password,salt){return crypto.scryptSync(password,salt,64).toString('hex');}
function getAuth(req){const cookie=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('mj_session='));if(!cookie)return null;
 const token=cookie.slice(11);if(!/^[\w-]{30,100}$/.test(token))return null;
 const row=db.prepare('SELECT u.id,u.username,u.email,u.plan,u.free_games_used,u.xp,u.last_active,u.streak FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(digest(token),Date.now());return row||null;}
function setCookie(res,token,req){const isHttps=(req.headers['x-forwarded-proto']||'').split(',')[0].trim()==='https';res.setHeader('Set-Cookie',`mj_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30*86400}${isHttps?'; Secure':''}`);}
function clearCookie(res,req){const secure=(req.headers['x-forwarded-proto']||'').split(',')[0].trim()==='https';res.setHeader('Set-Cookie',`mj_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure?'; Secure':''}`);}
async function body(req){let b='';for await(const c of req){b+=c;if(b.length>20000)throw Error('Solicitação muito grande.');}try{return b?JSON.parse(b):{};}catch{throw Error('JSON inválido.');}}
function rateLimit(req,action,limit,maxMinutes=15){let ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0];const key=action+':'+ip;const now=Date.now();const prev=attempts.get(key)||[];const recent=prev.filter(t=>t>now-maxMinutes*60000);if(recent.length>=limit)return false;recent.push(now);attempts.set(key,recent);return true;}
function securityHeaders(res){res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'");}
function verifyOrigin(req){
 const origin=req.headers.origin;if(!origin)return true;
 try{
  const u=new URL(origin);
  if(u.protocol!=='https:' && u.protocol!=='http:')return false;
  const host=req.headers['x-forwarded-host']||req.headers.host;
  if(u.host===host)return true;
  // Aceitar o domínio público ao operar atrás do proxy HTTPS do Netlify.
  // Ex.: PUBLIC_SITE_ORIGIN=https://nomade-geek.netlify.app
  const allowed=String(process.env.PUBLIC_SITE_ORIGIN||'').split(',').map(s=>s.trim()).filter(Boolean);
  return allowed.some(site=>{try{return new URL(site).origin===u.origin;}catch{return false;}});
 }catch{return false;}
}
function reqLogin(req,res){const user=getAuth(req);if(!user){error(res,401,'Entre na sua conta para participar do ranking.');return null;}return user;}
function cardPublic(c){return {japanese:c.japanese,reading:c.reading,side:c.side};}
function newGame(userId,mode,phase){const p=PHASES[phase], ids=mode==='hard'?[...p.ids]:shuffle([...p.ids]).slice(0,MODES[mode]);
 const cards=shuffle(ids.flatMap(id=>{const japanese=KANA[id][p.col],reading=KANA[id][2];
   if(mode==='easy')return [{id,japanese,reading,side:'bilingual'},{id,japanese,reading,side:'bilingual'}];
   return [{id,japanese,reading,side:'japanese'},{id,japanese,reading,side:'romaji'}];
 }));return {gameId:crypto.randomUUID(),userId,mode,phase,cards,matched:new Set(),selected:[],tries:0,matches:0,start:null,pendingUntil:0,usedHint:false,previewUntil:0,created:Date.now()};}
const VALID_PLANS=new Set(['bronze','prata','ouro']);
async function api(req,res,url){const method=req.method, route=url.pathname;
 if(method==='POST' && !verifyOrigin(req))return error(res,403,'Origem não autorizada.');
 if(route==='/api/health'&&method==='GET')return json(res,200,{ok:true,app:'Memória Japonesa',week:weekStart()});
 if(route==='/api/me'&&method==='GET'){const u=getAuth(req);return json(res,200,{user:safeUser(u),quota:u?getQuota(u):null,guestQuota:guestQuota(getGuest(req))});}
 if(route==='/api/signup'&&method==='POST'){
  if(!rateLimit(req,'signup',8))return error(res,429,'Muitas tentativas. Tente mais tarde.');
  const b=await body(req),username=String(b.username||'').trim(),email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');
  if(!/^[\p{L}\d_]{3,18}$/u.test(username))return error(res,400,'Nome de usuário: 3 a 18 caracteres, sem espaços.');
  if(email.length>160||!/^\S+@\S+\.\S+$/.test(email))return error(res,400,'Informe um e-mail válido.');
  if(password.length<8||password.length>128)return error(res,400,'Use senha de 8 a 128 caracteres.');
  const salt=crypto.randomBytes(16).toString('hex');
  try{const result=db.prepare('INSERT INTO users(username,email,salt,password_hash) VALUES(?,?,?,?)').run(username,email,salt,hashPassword(password,salt));
   const token=crypto.randomBytes(32).toString('base64url');db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(digest(token),result.lastInsertRowid,Date.now()+30*86400000);
   setCookie(res,token,req);return json(res,201,{user:safeUser(db.prepare('SELECT * FROM users WHERE id=?').get(result.lastInsertRowid))});
  }catch(e){if(String(e).includes('UNIQUE'))return error(res,409,'Nome de usuário ou e-mail já cadastrado.');throw e;}
 }
 if(route==='/api/login'&&method==='POST'){
  if(!rateLimit(req,'login',18))return error(res,429,'Muitas tentativas de login.');
  const b=await body(req),email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');
  const u=db.prepare('SELECT * FROM users WHERE email=?').get(email);
  const valid=u && Buffer.from(hashPassword(password,u.salt),'hex').length===64 && crypto.timingSafeEqual(Buffer.from(hashPassword(password,u.salt),'hex'),Buffer.from(u.password_hash,'hex'));
  if(!valid)return error(res,401,'E-mail ou senha incorretos.');
  const token=crypto.randomBytes(32).toString('base64url');db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(digest(token),u.id,Date.now()+30*86400000);
  setCookie(res,token,req);return json(res,200,{user:safeUser(u)});
 }
 if(route==='/api/logout'&&method==='POST'){
  const cookie=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('mj_session='));
  if(cookie)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(cookie.slice(11)));
  clearCookie(res,req);return json(res,200,{ok:true});
 }
 if(route==='/api/delete-account'&&method==='POST'){
  const u=reqLogin(req,res);if(!u)return;
  const b=await body(req),row=db.prepare('SELECT * FROM users WHERE id=?').get(u.id);const pw=String(b.password||'');
  if(!crypto.timingSafeEqual(Buffer.from(hashPassword(pw,row.salt),'hex'),Buffer.from(row.password_hash,'hex')))return error(res,403,'Senha incorreta.');
  db.prepare('DELETE FROM users WHERE id=?').run(u.id);sessionGames.delete('u:'+u.id);studySessions.delete(u.id);clearCookie(res,req);return json(res,200,{ok:true});
 }
 if(route==='/api/ranking'&&method==='GET'){
  const rows=db.prepare(`SELECT u.username,u.plan,SUM(s.points) points,COUNT(*) performances
    FROM scores s JOIN users u ON u.id=s.user_id WHERE s.week_start=?
    GROUP BY u.id ORDER BY points DESC,performances DESC,u.username COLLATE NOCASE ASC LIMIT 20`).all(weekStart());
  const my=getAuth(req);const mypoints=my?db.prepare('SELECT COALESCE(SUM(points),0) points FROM scores WHERE week_start=? AND user_id=?').get(weekStart(),my.id).points:null;
  return json(res,200,{weekStart:weekStart(),timeZone:'America/Bahia',list:rows,myPoints:mypoints});
 }
 if(route==='/api/my-stats'&&method==='GET'){
  const u=reqLogin(req,res);if(!u)return;
  const counts=db.prepare('SELECT COUNT(*) games,COALESCE(SUM(points),0) totalPoints,MIN(elapsed) bestSeconds FROM matches WHERE user_id=?').get(u.id);
  const best=db.prepare('SELECT mode,MAX(points) bestScore,COUNT(*) entries FROM scores WHERE user_id=? GROUP BY mode').all(u.id);
  const limit=u.plan==='ouro'?1000:u.plan==='prata'?50:u.plan==='bronze'?10:5;
  const history=db.prepare('SELECT mode,phase,points,tries,elapsed,recorded_at FROM matches WHERE user_id=? ORDER BY id DESC LIMIT ?').all(u.id,limit);
  const byMode=(u.plan==='prata'||u.plan==='ouro')?db.prepare('SELECT mode,COUNT(*) partidas,ROUND(AVG(elapsed)) mediaSegundos,MAX(points) recorde FROM matches WHERE user_id=? GROUP BY mode').all(u.id):[];
  const byPhase=u.plan==='ouro'?db.prepare('SELECT mode,phase,COUNT(*) partidas,MAX(points) recorde FROM matches WHERE user_id=? GROUP BY mode,phase ORDER BY mode,phase').all(u.id):[];
  return json(res,200,{counts,best,history,historyLimit:limit,byMode,byPhase,quota:getQuota(u),xp:u.xp,level:levelName(u.xp),streak:u.streak});
 }
 if(route==='/api/plan-interest'&&method==='POST'){
  const u=reqLogin(req,res);if(!u)return;const b=await body(req),plan=String(b.plan||'');
  if(!VALID_PLANS.has(plan))return error(res,400,'Plano inválido.');
  db.prepare('INSERT INTO interests(user_id,plan) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET plan=excluded.plan,registered_at=CURRENT_TIMESTAMP').run(u.id,plan);
  return json(res,200,{ok:true,message:'Interesse registrado. Nenhuma cobrança foi feita e o plano não foi ativado.'});
 }
 if(route==='/api/dashboard'&&method==='GET'){
  const u=reqLogin(req,res);if(!u)return;
  const today=dateLocal();const d=db.prepare('SELECT games,pairs,studies FROM daily_activity WHERE user_id=? AND day=?').get(u.id,today)||{games:0,pairs:0,studies:0};
  const wk=db.prepare('SELECT COUNT(*) games,COALESCE(SUM(points),0) points FROM matches WHERE user_id=? AND week_start=?').get(u.id,weekStart());
  const stud=db.prepare('SELECT COUNT(*) lessons,COALESCE(SUM(correct),0) correct FROM study_results WHERE user_id=?').get(u.id);
  const recent=db.prepare('SELECT COUNT(*) days FROM daily_activity WHERE user_id=? AND day>=? AND day<=?').get(u.id,dayOffset(today,-6),today).days;
  const miss=db.prepare('SELECT COUNT(*) wrong FROM study_attempts WHERE user_id=? AND mistakes>0').get(u.id).wrong;
  const wordsPracticed=db.prepare("SELECT COUNT(*) n FROM study_attempts WHERE user_id=? AND item_id LIKE 'word-%' AND total>0").get(u.id).n;
  const registered=db.prepare('SELECT created_at FROM users WHERE id=?').get(u.id).created_at;
  const dayIndex=Math.max(1,Math.min(30,Math.floor((new Date(today+'T12:00:00Z')-new Date(registered.replace(' ','T')+'Z'))/86400000)+1));
  const achievements=[
    {name:'Primeira partida',icon:'🌱',done:db.prepare('SELECT COUNT(*) n FROM matches WHERE user_id=?').get(u.id).n>=1},
    {name:'Aprendiz',icon:'⚔️',done:u.xp>=400},{name:'Ninja',icon:'🥷',done:u.xp>=1200},{name:'Mestre',icon:'🐉',done:u.xp>=2400},
    {name:'7 dias de estudo',icon:'📆',done:u.streak>=7},{name:'Primeiro treino',icon:'📚',done:stud.lessons>=1},
    {name:'3 partidas na semana',icon:'🏆',done:wk.games>=3}
  ];
  return json(res,200,{user:safeUser(u),quota:getQuota(u),daily:{...d,missions:[{label:'Concluir 1 partida',done:d.games>=1,progress:Math.min(1,d.games),target:1},{label:'Achar 10 pares',done:d.pairs>=10,progress:Math.min(10,d.pairs),target:10},{label:'Fazer 1 sessão de estudo',done:d.studies>=1,progress:Math.min(1,d.studies),target:1}]},weekly:{games:wk.games,points:wk.points,challengeGoal:3,done:wk.games>=3},challenge7:{activeDays:recent,streak:u.streak,target:7},studyPlan:{day:dayIndex,totalDays:30,stages:[{days:'1–7',name:'Hiragana e memória'},{days:'8–14',name:'Katakana e revisão'},{days:'15–21',name:'100 palavras e audição'},{days:'22–30',name:'Frases, N5 introdutório e simulado'}]},study:{lessons:stud.lessons,correct:stud.correct,weakItems:miss,wordsPracticed,wordsGoal:100},achievements,courses:Object.entries(studyCatalogs).map(([id,c])=>({id,...c,unlocked:!!studioAccess(u.plan,id)}))});
 }
 if(route==='/api/study/start'&&method==='POST'){
  const u=reqLogin(req,res);if(!u)return;
  if(!rateLimit(req,'study',100,10))return error(res,429,'Muitas sessões de estudo.');
  const b=await body(req),course=String(b.course||'');
  if(!Object.hasOwn(studyCatalogs,course))return error(res,400,'Curso não encontrado.');
  if(!studioAccess(u.plan,course))return json(res,403,{error:'Este treinamento está disponível a partir do plano '+studyCatalogs[course].level+'.',code:'PLAN_REQUIRED',requiredPlan:studyCatalogs[course].level});
  let qs=studyBank(course==='review'?'kana':course);
  if(course==='review'){
   const weak=db.prepare('SELECT item_id FROM study_attempts WHERE user_id=? AND mistakes>0 ORDER BY (mistakes*1.0/total) DESC,mistakes DESC LIMIT 40').all(u.id).map(r=>r.item_id);
   qs=qs.sort((a,b)=>(weak.includes(b.id)?1:0)-(weak.includes(a.id)?1:0));
   const prioritized=qs.filter(q=>weak.includes(q.id));qs=[...prioritized,...mixStudies(qs.filter(q=>!weak.includes(q.id)))];
  }else qs=mixStudies(qs);
  qs=qs.slice(0,studyCatalogs[course].size);
  const quiz={id:crypto.randomUUID(),userId:u.id,course,questions:qs,index:0,correct:0,started:Date.now()};studySessions.set(u.id,quiz);
  return json(res,200,{sessionId:quiz.id,course,title:studyCatalogs[course].title,total:qs.length,index:0,question:studioView(qs[0])});
 }
 if(route==='/api/study/answer'&&method==='POST'){
  const u=reqLogin(req,res);if(!u)return;
  const b=await body(req),g=studySessions.get(u.id);
  if(!g||b.sessionId!==g.id)return error(res,409,'Sessão de estudo inválida.');
  if(Date.now()-g.started>3600000){studySessions.delete(u.id);return error(res,410,'Estudo expirou. Comece novamente.');}
  const q=g.questions[g.index],chosen=String(b.answer||'');
  if(!q||!q.options.includes(chosen))return error(res,400,'Resposta inválida.');
  const right=chosen===q.answer;g.correct+=Number(right);
  db.prepare(`INSERT INTO study_attempts(user_id,item_id,total,mistakes) VALUES(?,?,1,?)
  ON CONFLICT(user_id,item_id) DO UPDATE SET total=total+1,mistakes=mistakes+excluded.mistakes`).run(u.id,q.id,right?0:1);
  g.index++;
  if(g.index<g.questions.length)return json(res,200,{correct:right,answer:q.answer,done:false,index:g.index,total:g.questions.length,next:studioView(g.questions[g.index])});
  const xp=20+g.correct*5;db.prepare('INSERT INTO study_results(user_id,course,correct,questions,day,xp) VALUES(?,?,?,?,?,?)').run(u.id,g.course,g.correct,g.questions.length,dateLocal(),xp);
  updateActivity(u.id,0,0,1,xp);studySessions.delete(u.id);
  return json(res,200,{correct:right,answer:q.answer,done:true,result:{correct:g.correct,total:g.questions.length,xp,level:levelName(u.xp+xp)}});
 }
 if(route==='/api/game/start'&&method==='POST'){
  if(!rateLimit(req,'game',90,5))return error(res,429,'Muitas partidas iniciadas.');
  const b=await body(req),mode=String(b.mode||''),phase=Number(b.phase);
  if(!Object.hasOwn(MODES,mode)||![0,1,2,3].includes(phase))return error(res,400,'Modo ou fase inválidos.');
  const u=getAuth(req);
  let key,remaining=null,guestRemaining=null;
  if(u){
   key='u:'+u.id;
   if(u.plan==='free'){
    const update=db.prepare("UPDATE users SET free_games_used=free_games_used+1 WHERE id=? AND plan='free' AND free_games_used<?").run(u.id,FREE_LIMIT);
    if(!update.changes)return json(res,403,{error:'Você utilizou as 16 partidas grátis da sua conta. Confira os planos para continuar.',code:'FREE_LIMIT_REACHED',quota:{limit:FREE_LIMIT,used:FREE_LIMIT,remaining:0}});
    remaining=FREE_LIMIT-db.prepare('SELECT free_games_used n FROM users WHERE id=?').get(u.id).n;
   }
  }else{
   // Cookie aleatório HttpOnly controla até 5 inícios anônimos neste navegador.
   // Cota gravada no SQLite. Apagar cookies poderá reiniciar o período de visitante;
   // não prometemos identificação entre dispositivos sem conta.
   let guest=getGuest(req);
   if(!guest){
    const token=crypto.randomBytes(32).toString('base64url');const tokenHash=digest(token);
    db.prepare('INSERT INTO guest_plays(token_hash,games_used) VALUES(?,0)').run(tokenHash);
    setGuestCookie(res,token,req);guest={token_hash:tokenHash,games_used:0};
   }
   const update=db.prepare('UPDATE guest_plays SET games_used=games_used+1 WHERE token_hash=? AND games_used<?').run(guest.token_hash,GUEST_LIMIT);
   if(!update.changes)return json(res,403,{error:'Você já iniciou suas 5 partidas sem cadastro. Crie sua conta para receber 16 partidas grátis e participar do ranking.',code:'GUEST_LIMIT_REACHED',guestQuota:{limit:GUEST_LIMIT,used:GUEST_LIMIT,remaining:0}});
   key='g:'+guest.token_hash;
   guestRemaining=GUEST_LIMIT-db.prepare('SELECT games_used n FROM guest_plays WHERE token_hash=?').get(guest.token_hash).n;
  }
  // Cada início, inclusive Reiniciar, consome uma entrada. Reserva atômica no SQLite.
  const game=newGame(key,mode,phase);sessionGames.set(key,game);
  return json(res,200,{gameId:game.gameId,cardCount:game.cards.length,total:MODES[mode],remaining,guestRemaining,ranked:Boolean(u)});
 }
 if(route==='/api/game/hint'&&method==='POST'){
  const player=getGameOwner(req);if(!player)return error(res,401,'Entre na conta ou inicie uma partida de visitante.');const b=await body(req),g=sessionGames.get(player.key);
  if(!g||g.gameId!==b.gameId||g.mode!=='medium'||g.usedHint||g.selected.length||g.previewUntil>Date.now())return error(res,409,'Dica indisponível.');
  g.usedHint=true;g.previewUntil=Date.now()+3000;
  return json(res,200,{cards:g.cards.map((c,index)=>({...cardPublic(c),index})),duration:3000});
 }
 if(route==='/api/game/flip'&&method==='POST'){
  const player=getGameOwner(req);if(!player)return error(res,401,'Entre na conta ou inicie uma partida de visitante.');const b=await body(req),g=sessionGames.get(player.key);
  if(!g||g.gameId!==b.gameId)return error(res,409,'Partida encerrada. Reinicie para jogar novamente.');
  if(Date.now()-g.created>3600000)return error(res,410,'A partida expirou. Reinicie.');
  if(g.previewUntil>Date.now())return error(res,409,'Aguarde a dica terminar.');
  if(g.pendingUntil>Date.now())return error(res,409,'Aguarde as cartas fecharem.');
  const i=Number(b.index);if(!Number.isInteger(i)||i<0||i>=g.cards.length||g.matched.has(i)||g.selected.includes(i))return error(res,400,'Carta indisponível.');
  if(!g.start)g.start=Date.now();
  const card=g.cards[i];g.selected.push(i);
  if(g.selected.length===1)return json(res,200,{index:i,card:cardPublic(card),matches:g.matches,tries:g.tries,complete:false});
  const [first,second]=g.selected,a=g.cards[first];g.tries++;
  const ok=a.id===card.id&&(g.mode==='easy'||a.side!==card.side);
  if(ok){g.matches++;g.matched.add(first);g.matched.add(second);g.selected=[];}
  else{g.pendingUntil=Date.now()+950;g.selected=[];}
  let finished=null;
  if(g.matches===MODES[g.mode]){
    const elapsed=Math.max(1,Math.ceil((Date.now()-g.start)/1000));
    const points=Math.max(100,Math.round(MODES[g.mode]*100+500*MODES[g.mode]/Math.max(1,g.tries)-elapsed*2));
    const u=player.user;
    if(u){
     const week=weekStart();
     db.prepare('INSERT INTO matches(user_id,week_start,mode,phase,points,elapsed,tries) VALUES(?,?,?,?,?,?,?)').run(u.id,week,g.mode,g.phase,points,elapsed,g.tries);
     updateActivity(u.id,1,MODES[g.mode],0,40+MODES[g.mode]*3);
     db.prepare(`INSERT INTO scores(user_id,week_start,mode,phase,points,elapsed,tries) VALUES(?,?,?,?,?,?,?)
       ON CONFLICT(user_id,week_start,mode,phase) DO UPDATE SET points=excluded.points,elapsed=excluded.elapsed,tries=excluded.tries,recorded_at=CURRENT_TIMESTAMP
       WHERE excluded.points>scores.points`).run(u.id,week,g.mode,g.phase,points,elapsed,g.tries);
     finished={elapsed,points,week,ranked:true};
    }else finished={elapsed,points:null,week:null,ranked:false};
    sessionGames.delete(player.key);
  }
  return json(res,200,{index:i,card:cardPublic(card),matches:g.matches,tries:g.tries,matched:ok,first,second,complete:Boolean(finished),result:finished});
 }
 return error(res,404,'Recurso não encontrado.');
}
const app=http.createServer(async(req,res)=>{
 securityHeaders(res);const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){
   try{return await api(req,res,url);}catch(e){if(e.message==='JSON inválido.'||e.message==='Solicitação muito grande.')return error(res,400,e.message);console.error('API:',e);return error(res,500,'Ocorreu um problema no servidor.');}
 }
 if(req.method!=='GET'&&req.method!=='HEAD')return error(res,405,'Método não permitido.');
 let uri=url.pathname; if(uri==='/')uri='/index.html';
 const allowed=new Set(['index.html','style.css','app.js','membership.js','membership.css','academy.js','academy.css','favicon.svg','manifest.webmanifest','anuncio.png','sw.js']);
 const filename=path.basename(uri);if(!allowed.has(filename)||uri!==`/${filename}`)return error(res,404,'Arquivo não encontrado.');
 const file=path.join(ROOT,filename);if(!fs.existsSync(file))return error(res,404,'Arquivo não encontrado.');
 res.writeHead(200,{'Content-Type':TYPES[path.extname(file)]||'application/octet-stream','Cache-Control':filename==='index.html'?'no-cache':'public, max-age=600'});
 if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);
});
app.listen(PORT,'0.0.0.0',()=>console.log(`Memória Japonesa pronta em http://localhost:${PORT}`));
