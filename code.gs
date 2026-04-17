const NOME_ABA = 'Atendimentos';

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(NOME_ABA);

    if (!sh) {
      return jsonOutput({ ok: false, error: `Aba '${NOME_ABA}' não encontrada.` });
    }

    const values = sh.getDataRange().getValues();
    if (values.length <= 1) {
      return jsonOutput([]);
    }

    const headers = values[0];
    const rows = values.slice(1);

    const data = rows
      .filter(row => row.some(cell => String(cell).trim() !== ''))
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });

    return jsonOutput(data);
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(NOME_ABA);

    if (!sh) {
      return jsonOutput({ ok: false, error: `Aba '${NOME_ABA}' não encontrada.` });
    }

    const body = e && e.postData && e.postData.contents
      ? JSON.parse(e.postData.contents)
      : null;

    if (!body) {
      return jsonOutput({ ok: false, error: 'Body da requisição vazio.' });
    }

    const novaLinha = [
      body.ano || '',
      body.mes || '',
      body.dia || '',
      body.numero_ticket || '',
      body.id_localidade || '',
      body.localidade || '',
      body.tempo_gasto_horas || 0,
      body.equipamentos_trocados || 0,
      body.equipamentos_configurados || 0,
      body.pontos_de_rede || 0,
      body.foto_antes_url || '',
      body.foto_depois_url || '',
      body.descricao_atendimento || ''
    ];

    sh.appendRow(novaLinha);

    return jsonOutput({
      ok: true,
      message: 'Registro salvo com sucesso.'
    });
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err) });
  }
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}