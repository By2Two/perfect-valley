"""
Extrai os dados e os ícones da planilha "Stardew Valley Completionist Checklist (Vanilla)".

Uso:
    python tools/extract_sheet.py caminho/da/planilha.xlsx

Gera:
    src/data/sheet.json   itens, seções, detalhes, aldeões, metas, nozes...
    public/icons/*.png    ícones (deduplicados por conteúdo)

As marcações (TRUE/FALSE) da planilha vão junto como "progresso da planilha",
que o app pode importar em Configurações.
"""
import hashlib, json, os, re, sys, zipfile
from xml.etree import ElementTree as ET
import openpyxl

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA_JSON = os.path.join(RAIZ, 'src', 'data', 'sheet.json')
SAIDA_ICONES = os.path.join(RAIZ, 'public', 'icons')
NS = {
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'xdr': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'm': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
}

# Abas com grade de itens: id da coleção -> (aba, exige caixa de marcar)
COLECOES = {
    'shipping': ('Shipping', True),
    'cooking': ('Cooking', True),
    'crafting': ('Crafting', True),
    'fishing': ('Fishing', True),
    'museum': ('Museum', True),
    'gear': ('Gear', True),
    'tailoring': ('Tailoring', True),
    'powers': ('Special Powers', True),
    'statues': ('Misc.', True),
    'bestiary': ('Monsters', False),
}
ROTULOS_GENERICOS = {'Product', 'Item', 'Monster', 'Recipe - Page 1', 'Recipe - Page 2', 'Recipe - Page 3', 'Cooking Recipes'}


def slug(texto):
    return re.sub(r'[^a-z0-9]+', '-', texto.lower()).strip('-')


def ler_ancoras(caminho):
    """Retorna {aba: [(linha, coluna, bytes_da_imagem)]} com linha/coluna base 1."""
    z = zipfile.ZipFile(caminho)

    def rels(p):
        try:
            return {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read(p))}
        except KeyError:
            return {}

    def resolver(base, alvo):
        return os.path.normpath(os.path.join(os.path.dirname(base), alvo)).replace('\\', '/')

    wb_rels = rels('xl/_rels/workbook.xml.rels')
    saida = {}
    for s in ET.fromstring(z.read('xl/workbook.xml')).iter(f"{{{NS['m']}}}sheet"):
        aba = s.get('name')
        arq = resolver('xl/workbook.xml', wb_rels[s.get(f"{{{NS['r']}}}id")])
        lista = []
        for alvo in rels(f"{os.path.dirname(arq)}/_rels/{os.path.basename(arq)}.rels").values():
            if 'drawings/drawing' not in alvo:
                continue
            desenho = resolver(arq, alvo)
            d_rels = rels(f"{os.path.dirname(desenho)}/_rels/{os.path.basename(desenho)}.rels")
            for anc in ET.fromstring(z.read(desenho)):
                de = anc.find('xdr:from', NS)
                blip = anc.find('.//a:blip', NS)
                if de is None or blip is None:
                    continue
                img = resolver(desenho, d_rels[blip.get(f"{{{NS['r']}}}embed")])
                lista.append((int(de.find('xdr:row', NS).text) + 1, int(de.find('xdr:col', NS).text) + 1, z.read(img)))
        saida[aba] = lista
    return saida


def salvar_icone(dados, cache):
    h = hashlib.sha1(dados).hexdigest()[:12]
    if h not in cache:
        with open(os.path.join(SAIDA_ICONES, f'{h}.png'), 'wb') as f:
            f.write(dados)
        cache.add(h)
    return h


def texto(v):
    if v is None:
        return None
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    s = str(v).strip()
    return s or None


def extrair_colecao(ws, wsf, ancoras, exige_check, cache):
    """wsf = mesma aba carregada com comentários."""
    com_imagem = {(r, c) for r, c, _ in ancoras}
    itens, ids = [], {}
    for r, c, dados in sorted(ancoras):
        nome = texto(ws.cell(r, c + 1).value)
        check = ws.cell(r, c - 1).value if c > 1 else None
        if not nome or (exige_check and not isinstance(check, bool)):
            continue
        # Cabeçalho da seção: sobe pela coluna do nome até achar uma linha sem item
        cab = None
        for rr in range(r - 1, 0, -1):
            v = ws.cell(rr, c + 1).value
            cv = ws.cell(rr, c - 1).value if c > 1 else None
            if isinstance(v, str) and not isinstance(cv, bool) and (rr, c) not in com_imagem:
                cab = rr
                break
        secao = texto(ws.cell(cab, c + 1).value) if cab else None
        linha_acima_e_cabecalho = cab and cab > 1 and (cab - 1, c) not in com_imagem and not isinstance(
            ws.cell(cab - 1, c - 1).value if c > 1 else None, bool) and not isinstance(ws.cell(cab - 1, c + 1).value, (int, float))
        if linha_acima_e_cabecalho:
            for cc in range(c + 1, 0, -1):
                sup = texto(ws.cell(cab - 1, cc).value)
                if sup and not sup.startswith('=') and not sup.replace('.', '').isdigit():
                    if secao in ROTULOS_GENERICOS or secao is None:
                        secao = sup
                    elif 'Progress' not in sup:
                        secao = f'{sup} · {secao}'
                    break
        if secao in ROTULOS_GENERICOS or (secao and secao.startswith('Recipe - Page')) or ws.title == 'Crafting':
            secao = None
        detalhes = []
        if cab:
            cc = c + 2
            while cc <= ws.max_column:
                rotulo = texto(ws.cell(cab, cc).value)
                if not rotulo or isinstance(ws.cell(r, cc).value, bool):
                    break
                valor = texto(ws.cell(r, cc).value)
                if valor:
                    detalhes.append([rotulo, valor])
                cc += 1
        nota = wsf.cell(r, c + 1).comment
        base = slug(nome)
        ids[base] = ids.get(base, 0) + 1
        item = {
            'id': base if ids[base] == 1 else f'{base}-{ids[base]}',
            'nome': nome,
            'icone': salvar_icone(dados, cache),
        }
        if secao:
            item['secao'] = secao
        if detalhes:
            item['detalhes'] = detalhes
        if nota and nota.text.strip():
            item['nota'] = nota.text.strip()
        if check is True:
            item['planilha'] = 1
        itens.append(item)
    return itens


def extrair_aldeoes(ws, wsf, ancoras, cache):
    saida = []
    for r, c, dados in sorted(ancoras):
        bruto = texto(ws.cell(r, c + 1).value)
        if not bruto:
            continue
        nome, _, aniversario = [p.strip() for p in bruto.partition('-')]
        info = {'nome': nome, 'aniversario': aniversario, 'icone': salvar_icone(dados, cache)}
        estado = texto(ws.cell(r + 1, c).value)
        info['solteiro'] = estado in ('Bachelor', 'Bachelorette')
        for dl, chave in ((2, 'ama'), (3, 'gosta')):
            com = wsf.cell(r + dl, c).comment
            if com:
                info[chave] = [l.strip() for l in com.text.splitlines() if l.strip()]
        if ws.cell(r, c - 1).value is True:
            info['planilha'] = 1
        saida.append(info)
    return saida


def extrair_nozes(ws):
    saida, secoes = [], {}
    for grupo in (1, 5):  # colunas A e E (checkbox)
        secao = None
        for r in range(5, ws.max_row + 1):
            marca = ws.cell(r, grupo).value
            tipo = texto(ws.cell(r, grupo + 2).value)
            if ws.cell(r, grupo + 1).value == '#':
                secao = (tipo or '').rstrip(' -').strip()
                continue
            if not isinstance(marca, bool) or not tipo:
                continue
            m = re.search(r'\((\d+)\)', tipo)
            pontos = int(m.group(1)) if m else 1
            como = texto(ws.cell(r, grupo + 3).value)
            ident = f'{slug(secao or "x")}-{len(saida) + 1}'
            item = {'id': ident, 'tipo': re.sub(r'\(\d+\)', '', tipo).strip(), 'pontos': pontos, 'secao': secao}
            if como:
                item['como'] = como
            if marca:
                item['planilha'] = 1
            saida.append(item)
    return saida


def extrair_metas(ws):
    saida = []
    for r in range(5, 40):
        nome = texto(ws.cell(r, 10).value)
        qtd = ws.cell(r, 11).value
        if not nome or not isinstance(qtd, (int, float)):
            continue
        saida.append({
            'id': slug(nome), 'nome': nome, 'meta': int(qtd),
            'recompensa': texto(ws.cell(r, 12).value), 'descricao': texto(ws.cell(r, 13).value),
            **({'planilha': 1} if ws.cell(r, 9).value is True else {}),
        })
    return saida


def extrair_perfeicao(ws):
    estrelas, obeliscos = [], []
    for r in range(2, 9):
        nome = texto(ws.cell(r, 7).value)
        if nome:
            estrelas.append({'id': slug(nome), 'nome': nome, 'como': texto(ws.cell(r, 8).value),
                             **({'planilha': 1} if ws.cell(r, 6).value is True else {})})
    for r in range(11, 15):
        nome = texto(ws.cell(r, 7).value)
        if nome:
            obeliscos.append({'id': slug(nome), 'nome': nome, **({'planilha': 1} if ws.cell(r, 6).value is True else {})})
    relogio = ws.cell(4, 2).value == 'Yes'
    return estrelas, obeliscos, relogio


def extrair_habilidades(ws):
    saida = {}
    for r in range(1, ws.max_row + 1):
        for c in range(1, ws.max_column + 1):
            v = ws.cell(r, c).value
            if v in ('Farming', 'Mining', 'Foraging', 'Fishing', 'Combat') and isinstance(ws.cell(r, c + 1).value, bool):
                saida[v.lower()] = sum(1 for k in range(c + 1, c + 14) if ws.cell(r, k).value is True)
    return saida


def main(caminho):
    os.makedirs(SAIDA_ICONES, exist_ok=True)
    os.makedirs(os.path.dirname(SAIDA_JSON), exist_ok=True)
    ancoras = ler_ancoras(caminho)
    wb = openpyxl.load_workbook(caminho, data_only=True)
    wbf = openpyxl.load_workbook(caminho)
    cache = set()
    colecoes = {}
    for ident, (aba, exige) in COLECOES.items():
        colecoes[ident] = extrair_colecao(wb[aba], wbf[aba], ancoras[aba], exige, cache)
    estrelas, obeliscos, relogio = extrair_perfeicao(wb['Perfection'])
    dados = {
        'colecoes': colecoes,
        'aldeoes': extrair_aldeoes(wb['Villagers'], wbf['Villagers'], ancoras['Villagers'], cache),
        'nozes': extrair_nozes(wb['Golden Walnuts']),
        'metasMonstros': extrair_metas(wb['Monsters']),
        'estrelas': estrelas,
        'obeliscos': obeliscos,
        'planilha': {'relogio': relogio, 'habilidades': extrair_habilidades(wb['Farmer Skills'])},
    }
    with open(SAIDA_JSON, 'w', encoding='utf-8') as f:
        json.dump(dados, f, ensure_ascii=False, separators=(',', ':'))
    for k, v in colecoes.items():
        print(f'{k:10} {len(v):4} itens')
    print('aldeoes', len(dados['aldeoes']), '| nozes', sum(n['pontos'] for n in dados['nozes']),
          '| metas', len(dados['metasMonstros']), '| icones', len(cache))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'Stardew_Valley_Completionist_Checklist__Vanilla_.xlsx')
