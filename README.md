# Nômade Geek Japanese · versão V6 (5 partidas sem login)

## O que está implementado

- **Visitantes** podem iniciar até 5 partidas sem cadastro, em qualquer modo (Fácil, Médio ou Difícil). A contagem é guardada no SQLite, associada a cookie aleatório `mj_guest` com atributo `HttpOnly`. Um início ou reinício consome uma partida, mesmo que abandonada.
- Depois de 5 inícios, a sexta tentativa mostra **Criar conta e continuar**.
- **Conta gratuita** recebe 16 partidas adicionais de sua própria cota, preservada por conta no servidor. Essas partidas são **além das 5 de visitante**, não um limite compartilhado.
- Somente partidas jogadas **logado** entram no ranking semanal, XP e histórico. Visitantes não recebem pontuação oficial.
- Os planos **Bronze R$ 20, Prata R$ 30, Ouro R$ 40 por mês** permanecem vitrine sem checkout. Ninguém é cobrado. Contas premium só são liberadas mediante ativação administrativa legítima.
- Mantidos os três modos, as quatro fases, missões, exercícios e cursos introdutórios.

## Limitações transparentes

- Sem conta não há identificação pessoal confiável; limpar cookies, trocar de navegador ou dispositivo pode reiniciar o limite de visitante. O sistema não consegue garantir 5 partidas **por pessoa**. Não há truques que resolvam esse problema de forma confiável sem identificar o visitante.
- O login e o ranking dependem de **servidor Node.js + SQLite persistente**. Enviar o ZIP ao Netlify Drop, isoladamente, NÃO é suficiente.
- Partidas anônimas NÃO são transferidas para o ranking após o cadastro. O progresso visual de fases e recordes locais é mantido no navegador.
- O cookie de visitante é mantido por até 365 dias; no backend fica o hash do identificador e a quantidade usada.
- Necessários confirmação de e-mail, recuperação de senha, controles anti-bot, política LGPD e integração real com Asaas antes da abertura comercial.

## Testes locais

Requer Node.js 22+.

```sh
npm test
npm start
```

Acesse `http://localhost:3000`. `npm test` valida o limite de 5 partidas anônimas, bloqueio da sexta, modos, conclusão de partida sem login, cota das 16 partidas da conta, ranking, XP e planos.

## Como publicar no Render

**Ainda não foi publicado por este pacote.** O Render conectado não tinha serviços ou repositório Git disponíveis quando esta versão foi preparada.

1. No GitHub, crie um repositório privado chamado `nomade-geek-japanese` e envie os **arquivos extraídos** desta pasta, com `render.yaml`, `server.js` e `package.json` na raiz. Não envie o ZIP como um único arquivo.
2. Em **Render → New → Blueprint**, conecte o repositório. O `render.yaml` solicita o serviço Node.js **starter pago** com volume persistente de **1 GB**. Confira as cobranças atuais mostradas no Render antes de confirmar.
3. O serviço inicia com `npm start`. Teste `https://SEU-SITE.onrender.com/api/health`: deve retornar JSON com `ok:true`.
4. Abra `https://SEU-SITE.onrender.com/` e teste as 5 partidas como visitante, o bloqueio da sexta, criação de uma conta e a 16ª/17ª partidas da conta.
5. Para manter `nomade-geek.netlify.app`, configure depois uma regra de proxy de `/api/*` ao domínio do Render, usando o **domínio real** fornecido pelo Render. Também atualize o frontend do Netlify; se não fizer isso, use o endereço do Render como endereço principal.

**Não publicar anúncios ou aceitar assinaturas reais antes de testar o cadastro e configurar os pagamentos.**
