'use strict';
/** Conteúdo educativo original e introdutório. N5 é trilha de introdução, não curso completo ou certificação JLPT. */
const kana = [
 ['あ','a'],['い','i'],['う','u'],['え','e'],['お','o'],['か','ka'],['き','ki'],['く','ku'],['け','ke'],['こ','ko'],['さ','sa'],['し','shi'],['す','su'],['せ','se'],['そ','so'],['た','ta'],['ち','chi'],['つ','tsu'],['て','te'],['と','to'],['な','na'],['に','ni'],['ぬ','nu'],['ね','ne'],['の','no'],['は','ha'],['ひ','hi'],['ふ','fu'],['へ','he'],['ほ','ho'],['ま','ma'],['み','mi'],['む','mu'],['め','me'],['も','mo'],['や','ya'],['ゆ','yu'],['よ','yo'],['ら','ra'],['り','ri'],['る','ru'],['れ','re'],['ろ','ro'],['わ','wa'],['を','wo'],['ん','n']
];
const words = [
 ['🐱','ねこ','neko','gato'],['🐕','いぬ','inu','cachorro'],['💧','みず','mizu','água'],['🍚','ごはん','gohan','refeição/arroz cozido'],['🍵','おちゃ','ocha','chá'],['📚','ほん','hon','livro'],['🌸','はな','hana','flor'],['🏠','いえ','ie','casa'],['☀️','たいよう','taiyou','sol'],['🌙','つき','tsuki','lua'],['🌧️','あめ','ame','chuva'],['🗻','やま','yama','montanha'],['🌊','うみ','umi','mar'],['🚃','でんしゃ','densha','trem'],['🐟','さかな','sakana','peixe'],['🍎','りんご','ringo','maçã'],['👦','こども','kodomo','criança'],['👩‍🏫','せんせい','sensei','professor(a)'],['👩‍🎓','がくせい','gakusei','estudante'],['🧑‍🤝‍🧑','ともだち','tomodachi','amigo(a)'],['✏️','えんぴつ','enpitsu','lápis'],['🚗','くるま','kuruma','carro'],['🕗','じかん','jikan','tempo/horas'],['🍞','パン','pan','pão'],
 ['🍣','すし','sushi','sushi'],['🦅','とり','tori','pássaro'],['🐭','ねずみ','nezumi','rato'],['🐸','かえる','kaeru','sapo'],['🐰','うさぎ','usagi','coelho'],['🐻','くま','kuma','urso'],['🐷','ぶた','buta','porco'],['🐄','うし','ushi','vaca'],['🐎','うま','uma','cavalo'],['🐍','へび','hebi','cobra'],
 ['🌲','き','ki','árvore'],['🌱','くさ','kusa','grama'],['🍃','はっぱ','happa','folha'],['🌟','ほし','hoshi','estrela'],['☁️','くも','kumo','nuvem'],['⛄','ゆき','yuki','neve'],['🔥','ひ','hi','fogo'],['🪨','いし','ishi','pedra'],['🌬️','かぜ','kaze','vento'],['🛣️','みち','michi','caminho'],
 ['🍙','おにぎり','onigiri','bolinho de arroz'],['🥚','たまご','tamago','ovo'],['🥩','にく','niku','carne'],['🥬','やさい','yasai','legumes'],['🍓','いちご','ichigo','morango'],['🍊','みかん','mikan','tangerina'],['🍌','バナナ','banana','banana'],['☕','コーヒー','koohii','café'],['🥛','ぎゅうにゅう','gyuunyuu','leite'],['🍜','ラーメン','raamen','lámen'],
 ['👨','おとこ','otoko','homem'],['👩','おんな','onna','mulher'],['🧑‍🤝‍🧑','かぞく','kazoku','família'],['👨','ちち','chichi','meu pai'],['👩','はは','haha','minha mãe'],['👴','おじいさん','ojiisan','avô / senhor idoso'],['👵','おばあさん','obaasan','avó / senhora idosa'],['🧑','ひと','hito','pessoa'],['👶','あかちゃん','akachan','bebê'],['🧑‍⚕️','いしゃ','isha','médico(a)'],
 ['🏫','がっこう','gakkou','escola'],['🏥','びょういん','byouin','hospital'],['🏬','みせ','mise','loja'],['🏙️','まち','machi','cidade'],['🏞️','こうえん','kouen','parque'],['🚉','えき','eki','estação'],['🚲','じてんしゃ','jitensha','bicicleta'],['✈️','ひこうき','hikouki','avião'],['🚌','バス','basu','ônibus'],['🚕','タクシー','takushii','táxi'],
 ['🛏️','ベッド','beddo','cama'],['🚪','ドア','doa','porta'],['🪟','まど','mado','janela'],['🪑','いす','isu','cadeira'],['🪵','つくえ','tsukue','mesa de estudo'],['🖊️','ペン','pen','caneta'],['🎒','かばん','kaban','bolsa'],['👟','くつ','kutsu','sapato'],['👕','ふく','fuku','roupa'],['⌚','とけい','tokei','relógio'],
 ['🌅','あさ','asa','manhã'],['🌃','よる','yoru','noite'],['🌞','ひる','hiru','meio-dia'],['📅','きょう','kyou','hoje'],['📅','あした','ashita','amanhã'],['📅','きのう','kinou','ontem'],['⌛','いま','ima','agora'],['🕐','いちじ','ichiji','uma hora'],['🗓️','しゅうまつ','shuumatsu','fim de semana'],['🗓️','まいにち','mainichi','todos os dias'],
 ['💖','すき','suki','gostar'],['🙋','はい','hai','sim'],['🙅','いいえ','iie','não'],['👋','こんにちは','konnichiwa','olá / boa tarde'],['👋','さようなら','sayounara','adeus'],['🙏','ありがとう','arigatou','obrigado(a)']
];
const n5 = [
 ['N5 • Cumprimentos','おはようございます','bom dia (forma educada)',['boa noite','bom dia (forma educada)','até amanhã','obrigado']],
 ['N5 • Cumprimentos','こんばんは','boa noite (ao cumprimentar)',['boa noite (ao cumprimentar)','boa tarde','desculpe','bem-vindo']],
 ['N5 • Cumprimentos','ありがとうございます','muito obrigado(a)',['desculpe','muito obrigado(a)','boa noite','até logo']],
 ['N5 • Cumprimentos','すみません','com licença / desculpe',['estudante','com licença / desculpe','boa tarde','água']],
 ['N5 • Apresentação','わたしは がくせいです。','Eu sou estudante.',['Eu sou estudante.','Você é professor.','Nós somos amigos.','Eu estou cansado.']],
 ['N5 • Apresentação','わたしは ブラジルじんです。','Sou brasileiro(a).',['Sou japonês(a).','Sou brasileiro(a).','Sou professor(a).','Eu gosto de sushi.']],
 ['N5 • Apresentação','おなまえは なんですか。','Qual é o seu nome?',['Onde você mora?','Qual é o seu nome?','Quantos anos você tem?','Que horas são?']],
 ['N5 • Apresentação','はい','sim',['não','talvez','sim','obrigado']],
 ['N5 • Apresentação','いいえ','não',['sim','desculpe','não','olá']],
 ['N5 • Partículas','わたしは がくせいです。','A partícula は (pronunciada wa) marca o tópico.',['A partícula は (pronunciada wa) marca o tópico.','は indica sempre o objeto direto.','は é a forma de passado.','は significa água.']],
 ['N5 • Partículas','みずを のみます。','A partícula を marca o objeto da ação.',['A partícula を marca o objeto da ação.','を marca uma pergunta.','を indica plural.','を é uma saudação.']],
 ['N5 • Partículas','がっこうに いきます。','に pode indicar o destino.',['に indica necessariamente negação.','に pode indicar o destino.','に significa livro.','に indica passado.']],
 ['N5 • Partículas','ともだちと はなします。','と significa “com” nesse contexto.',['と significa “com” nesse contexto.','と indica plural.','と significa “ontem”.','と significa “não”.']],
 ['N5 • Números','いち','um',['dois','três','um','cinco']],['N5 • Números','に','dois',['quatro','dois','seis','sete']],['N5 • Números','さん','três',['três','um','oito','dez']],['N5 • Números','よん','quatro',['quatro','três','oito','seis']],['N5 • Números','ご','cinco',['seis','dois','cinco','nove']],
 ['N5 • Verbos','たべます','comer (forma educada)',['beber','comer (forma educada)','comprar','ir']],
 ['N5 • Verbos','のみます','beber (forma educada)',['correr','dormir','beber (forma educada)','ler']],
 ['N5 • Verbos','いきます','ir (forma educada)',['ir (forma educada)','vir','estudar','comprar']],
 ['N5 • Verbos','みます','ver / assistir (forma educada)',['ouvir','ver / assistir (forma educada)','escrever','comer']],
 ['N5 • Verbos','べんきょうします','estudar (forma educada)',['trabalhar','dormir','estudar (forma educada)','voltar']],
 ['N5 • Frases básicas','これは ほんです。','Isto é um livro.',['Aquilo é uma casa.','Isto é um livro.','Aqui está um gato.','Eu gosto de água.']],
 ['N5 • Frases básicas','きょうは あついです。','Hoje está quente.',['Hoje está quente.','Amanhã choveu.','Ontem estava frio.','Hoje está escuro.']],
 ['N5 • Frases básicas','どこですか。','Onde fica?',['Quem é você?','Onde fica?','É caro?','Que horas são?']],
];
const phrases = [
 ['Aventura','いっしょに いこう！','Vamos juntos!'],['Amizade','だいじょうぶ？','Está tudo bem?'],['Coragem','あきらめないで！','Não desista!'],['Batalha','じゅんびは いい？','Está pronto(a)?'],['Aventura','はやく いこう！','Vamos logo!'],['Escola','また あした！','Até amanhã!'],['Mistério','これは なんだ？','O que é isso?'],['Amizade','まって！','Espere!'],['Viagem','いま どこ？','Onde você está agora?'],['Alívio','よかった！','Que bom!'],['Coragem','がんばって！','Dê o seu melhor!'],['Viagem','いってきます！','Estou indo! (e volto)']
];
function randArray(a){const out=[...a];for(let i=out.length-1;i>0;i--){const j=require('node:crypto').randomInt(i+1);[out[i],out[j]]=[out[j],out[i]];}return out;}
function options(correct,others){return randArray([correct,...randArray([...new Set(others.filter(x=>x!==correct))]).slice(0,3)]);}
function question(id,unit,prompt,answer,alternatives,extra={}){return {id,unit,prompt,answer,options:options(answer,alternatives),...extra};}
function bank(type){
 if(type==='kana'||type==='review'){return kana.map(([j,r],i)=>question('kana-'+i,'Hiragana','Qual é a leitura de '+j+'?',r,kana.map(k=>k[1]).filter(x=>x!==r),{speech:j}));}
 if(type==='vocab'||type==='audio'){return words.map(([emoji,j,r,pt],i)=>question('word-'+i,'Vocabulário',type==='audio'?'Ouça a palavra e escolha o significado.':`${emoji} ${j} (${r}) significa...`,pt,words.map(w=>w[3]).filter(x=>x!==pt),{speech:j,emoji,type}));}
 if(type==='n5'){return n5.map(([unit,prompt,answer,opts],i)=>question('n5-'+i,unit,prompt,answer,opts,{speech:prompt}));}
 if(type==='anime'){return phrases.map(([unit,j,pt],i)=>question('anime-'+i,`Expressões • ${unit}`,j,pt,phrases.map(x=>x[2]).filter(x=>x!==pt),{speech:j}));}
 if(type==='weekly'){return [...bank('kana'),...bank('vocab'),...bank('n5')];}
 return [];
}
const catalogs={kana:{title:'Revisão de kana',level:'bronze',emoji:'🈁',description:'Reveja hiragana com questões adaptadas aos seus erros.',size:8},review:{title:'Revisão inteligente',level:'bronze',emoji:'🧠',description:'Treino focado no que você errou.',size:8},vocab:{title:'Vocabulário ilustrado',level:'prata',emoji:'🖼️',description:'Palavras com ícones e tradução em português.',size:8},audio:{title:'Treino de audição',level:'prata',emoji:'🔊',description:'Ouça japonês e identifique o significado.',size:8},n5:{title:'Trilha N5 • Introdução',level:'ouro',emoji:'🇯🇵',description:'Cumprimentos, partículas, números e verbos básicos.',size:10},anime:{title:'Frases de aventura',level:'ouro',emoji:'🎌',description:'Expressões originais em clima de anime.',size:8},weekly:{title:'Simulado semanal',level:'ouro',emoji:'📝',description:'Mistura de kana, vocabulário e fundamentos N5.',size:12}};
module.exports={bank,catalogs,randArray};
