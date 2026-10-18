# Perfect Valley (Vale Perfeito)

Rastreador de Perfeição para Stardew Valley 1.6. Uma fazenda 3D em pixel art que reflete o seu progresso, com os itens, aldeões, peixes e coleções do jogo.

## Rodar

```bash
npm install
npm run dev
```

Abra http://localhost:5173. O progresso fica salvo no navegador.

## O que tem

- **Fazenda 3D em pixel art**: arraste para mover, use a roda do mouse ou a pinça para dar zoom (o zoom vai na direção do cursor), clique duas vezes para aproximar. A câmera acompanha o mouse de leve. Todas as texturas são desenhadas em código, com contorno de 1 pixel nas construções.
- **Construções clicáveis**: cada uma abre uma categoria. Casa → amizades, caixa de envios → envios, bancada → criação, celeiro → culinária, lavoura → nível, lago → pesca, mina → monstros, obeliscos → obeliscos, Relógio de Ouro → relógio, palmeira → nozes douradas.
- **Mundo vivo**: galinhas, vaca, porco, ovelha e cabra no cercado do celeiro; seis irrigadores que esguicham água e molham a terra; moinho girando, fumaça na chaminé, peixe pulando, borboletas, pássaros, vaga-lumes e postes acesos à noite.
- **Estações**: primavera (pétalas), verão, outono (folhas caindo) e inverno (neve nos telhados e árvores, lago congelado). Escolha em Configurações.
- **Hora do dia**: segue o relógio real ou fica fixa em dia, pôr do sol ou noite. Para testar, use `?hour=21` na URL. Os ponteiros do Relógio de Ouro mostram a mesma hora.
- **Progresso na fazenda**: obeliscos (Terra, Água, Deserto e Ilha, com portal girando) e o Relógio de Ouro aparecem quando marcados e ficam translúcidos enquanto não forem construídos; a lavoura cresce com o nível do fazendeiro.
- **Animações desligadas**: em Configurações; tudo que se mexe para (também respeita a preferência de movimento reduzido do sistema).
- **Coleções com ícones**: envios, culinária, criação e peixes em grade de inventário, com filtros, busca, seções e detalhes de cada item. Em **Mais coleções** ficam museu, armas e equipamentos, alfaiataria, itens especiais e livros, espantalhos raros e o bestiário.
- **Aldeões** com retrato, aniversário, corações e presentes favoritos.
- **Nozes douradas** item a item (130 no total).
- **Idioma**: inglês por padrão (Perfect Valley), português em Configurações (Vale Perfeito). Em português tudo é traduzido, inclusive itens, peixes, detalhes e notas; só os nomes dos aldeões ficam como no jogo.
- **Teclado**: 1–9, 0, - e = abrem as categorias; Esc fecha.

## Dados

Os itens, as seções e os ícones vêm de `src/data/sheet.json` e `public/icons/`. A tradução para português fica em `src/data/pt.json` (texto em inglês → português) e só é baixada quando o idioma é português; um texto novo que não esteja lá aparece em inglês.

## Fazenda importada do save

Em **Configurações → Sua fazenda → Enviar save da fazenda** dá para enviar o save do Stardew Valley (o arquivo com o nome da fazenda, **sem extensão**, dentro de `StardewValley/Saves/NomeDaFazenda_123456789/`; não use `SaveGameInfo` nem os `_old`). O mapa 3D passa a mostrar a fazenda real: prédios, lavoura, árvores, cercas, irrigadores, espantalhos, pisos e a casa no nível em que está. O terreno (lagos, rios, penhascos, floresta das bordas, áreas onde não dá para construir) vem do mapa do tipo de fazenda do save, e os animais de cada celeiro e galinheiro andam na frente dos prédios (somem no inverno e à noite, como no jogo). O save é lido só no navegador e o resultado fica guardado neste dispositivo. "Usar fazenda padrão" volta ao cenário original.

Os mapas das 8 fazendas ficam em `src/data/farmMaps.json`, gerado a partir da pasta `Content/Maps` do jogo:

```bash
node tools/extract_farm_maps.mjs caminho/para/Content/Maps
```

## Estrutura

```
src/
  catalog.js       categorias, pesos da Perfeição e coleções extras
  items.js         busca de itens e ícones
  progress.js      cálculo da Perfeição
  data/sheet.json  itens, aldeões, metas e nozes
  data/pt.json     tradução dos textos dos itens para português
  farmSave.js      leitura do save do Stardew (XML) em um layout de fazenda
  store.js         progresso e preferências do dispositivo
  i18n.js          idioma atual e tradução dos termos
  dictionary.js    textos da interface em inglês e português
  glossary.js      termos traduzidos à mão
  world/scene.js   renderização, câmera (zoom, arrastar, parallax), dia e noite
  world/farm.js    orquestra o mundo: luzes, partículas, estações e progresso
  world/textures.js texturas em pixel art desenhadas em canvas
  world/util.js    materiais, junção de geometrias, contorno e modo fantasma
  world/imported/  fazenda importada: terreno, plantas, objetos e prédios
  world/assets/    house, barn (animais), sprinklers (lavoura e irrigadores), mine,
                   obelisks, clock e scenery (terreno, lago, cercas, árvores)
  ui/app.js        HUD, controles, barra de itens e painel
  ui/panels.js     telas de cada categoria e grade de coleção
  ui/modals.js     boas-vindas, login e configurações
  icons.js         ícones em pixel art desenhados em código
public/
  icons/           ícones dos itens e aldeões
  sky/clouds.svg   nuvens do céu
tools/
  extract_farm_maps.mjs  gera src/data/farmMaps.json a partir dos mapas do jogo
```

## Qualidade

```bash
npm run lint
npm test
```

## Arte

Os ícones e retratos dos itens e aldeões são arte do jogo e pertencem à ConcernedApe. Para uso pessoal não há problema. Se for publicar o site, leia antes a política de conteúdo de fãs da ConcernedApe. A fazenda 3D (geometria e texturas geradas em código), as molduras e os ícones de interface são originais, apenas inspirados no estilo do jogo.

Projeto de fã, sem ligação com a ConcernedApe.
