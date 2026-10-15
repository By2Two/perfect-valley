# Perfect Valley (Vale Perfeito)

Rastreador de Perfeição para Stardew Valley 1.6. Uma fazenda 3D em pixel art que reflete o seu progresso, com os itens e ícones da planilha *Stardew Valley Completionist Checklist (Vanilla)*.

## Rodar

```bash
npm install
npm run dev
```

Abra http://localhost:5173. Sem configurar nada, dá para usar com **Continuar sem conta** (o progresso fica no navegador).

## O que tem

- **Fazenda 3D em pixel art**: arraste para mover, use a roda do mouse ou a pinça para dar zoom (o zoom vai na direção do cursor), clique duas vezes para aproximar. A câmera acompanha o mouse de leve. Todas as texturas são desenhadas em código, com contorno de 1 pixel nas construções.
- **Construções clicáveis**: cada uma abre uma categoria. Casa → amizades, caixa de envios → envios, bancada → criação, celeiro → culinária, lavoura → nível, lago → pesca, mina → monstros, obeliscos → obeliscos, Relógio de Ouro → relógio, palmeira → nozes douradas.
- **Mundo vivo**: galinhas, vaca, porco, ovelha e cabra no cercado do celeiro; seis irrigadores que esguicham água e molham a terra; moinho girando, fumaça na chaminé, peixe pulando, borboletas, pássaros, vaga-lumes e postes acesos à noite.
- **Estações**: primavera (pétalas), verão, outono (folhas caindo) e inverno (neve nos telhados e árvores, lago congelado). Escolha em Configurações.
- **Hora do dia**: segue o relógio real ou fica fixa em dia, pôr do sol ou noite. Para testar, use `?hora=21` na URL. Os ponteiros do Relógio de Ouro mostram a mesma hora.
- **Progresso na fazenda**: obeliscos (Terra, Água, Deserto e Ilha, com portal girando) e o Relógio de Ouro aparecem quando marcados e ficam translúcidos enquanto não forem construídos; a lavoura cresce com o nível do fazendeiro.
- **Animações desligadas**: em Configurações; tudo que se mexe para (também respeita a preferência de movimento reduzido do sistema).
- **Coleções com ícones**: envios, culinária, criação e peixes em grade de inventário, com filtros, busca, seções e detalhes de cada item. Em **Mais coleções** ficam museu, armas e equipamentos, alfaiataria, itens especiais e livros, espantalhos raros e o bestiário.
- **Aldeões** com retrato, aniversário, corações e presentes favoritos (com ícone quando o item existe na planilha).
- **Nozes douradas** item a item (130 no total).
- **Idioma**: inglês por padrão (Perfect Valley), português em Configurações (Vale Perfeito). Em português tudo é traduzido, inclusive itens, peixes, detalhes e notas da planilha; só os nomes dos aldeões ficam como no jogo.
- **Importar da planilha**: em Configurações, **Importar marcações da planilha** copia tudo que estava marcado na sua planilha.
- **Teclado**: 1–9, 0, - e = abrem as categorias; Esc fecha.

## Contas (Google e e-mail)

1. Crie um projeto em https://console.firebase.google.com e adicione um **app da Web**.
2. Em **Authentication > Método de login**, ative **Google** e **E-mail/senha**.
3. Em **Firestore Database**, crie o banco e cole o conteúdo de `firestore.rules` na aba **Regras**.
4. Copie `.env.example` para `.env.local` e preencha `apiKey`, `authDomain`, `projectId` e `appId`.
5. Reinicie o `npm run dev`.

Ao entrar, vale o save mais recente: se a conta tiver algo mais novo que o navegador, ela ganha; senão, o navegador sobe para a conta. Para publicar, adicione o domínio do site em **Authentication > Configurações > Domínios autorizados**.

## Atualizar os dados da planilha

Os itens, as seções e os ícones vêm de `src/data/sheet.json` e `public/icons/`. A tradução para português fica em `src/data/pt.json` (texto em inglês → português) e só é baixada quando o idioma é português; um texto novo que não esteja lá aparece em inglês. Se a planilha mudar, gere de novo:

```bash
pip install openpyxl
python tools/extract_sheet.py caminho/da/planilha.xlsx
```

## Estrutura

```
src/
  data.js          regras e pesos da Perfeição, cálculo e importação da planilha
  data/sheet.json  itens, aldeões, metas e nozes extraídos da planilha
  data/pt.json     tradução dos textos da planilha para português
  store.js         progresso (navegador + nuvem) e preferências do dispositivo
  i18n.js          textos em inglês e português
  firebase.js      Google, e-mail/senha e Firestore
  world/scene.js   renderização, câmera (zoom, arrastar, parallax), dia e noite
  world/farm.js    orquestra o mundo: luzes, partículas, estações e progresso
  world/texturas.js texturas em pixel art desenhadas em canvas
  world/util.js    materiais, junção de geometrias, contorno e modo fantasma
  world/assets/    casa, celeiro (animais), lavoura e irrigadores, mina,
                   obeliscos, relógio e cenário (terreno, lago, cercas, árvores)
  ui/app.js        HUD, controles, barra de itens e painel
  ui/panels.js     telas de cada categoria e grade de coleção
  ui/modais.js     boas-vindas, login e configurações
  icons.js         ícones em pixel art desenhados em código
public/
  icons/           ícones extraídos da planilha
  ceu/nuvens.svg   nuvens do céu
tools/
  extract_sheet.py extrator da planilha
```

## Arte

Os ícones e retratos extraídos da planilha são arte do jogo e pertencem à ConcernedApe. Para uso pessoal não há problema. Se for publicar o site, leia antes a política de conteúdo de fãs da ConcernedApe. A fazenda 3D (geometria e texturas geradas em código), as molduras e os ícones de interface são originais, apenas inspirados no estilo do jogo.

Projeto de fã, sem ligação com a ConcernedApe.
