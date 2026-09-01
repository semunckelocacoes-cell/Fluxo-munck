const https = require("https");

function getCertBuffer() {
  const p1 = (process.env.CERT_PFX_BASE64_1 || "").trim();
  const p2 = (process.env.CERT_PFX_BASE64_2 || "").trim();
  const p3 = (process.env.CERT_PFX_BASE64_3 || "").trim();
  return Buffer.from(p1 + p2 + p3, "base64");
}

function gerarXmlNFSe(dados) {
  const { cliente, cnpjCliente, valor, servico, data, numeroRps } = dados;
  const dataFormatada = data || new Date().toISOString().split("T")[0];
  const valorFormatado = parseFloat(valor || 0).toFixed(2);
  const cnpjPrestador = "64140547000175";
  const inscricaoMunicipal = "10747125";
  const cnpjTomador = (cnpjCliente || "").replace(/\D/g, "");
  const cnpjTag = cnpjTomador.length === 14
    ? "<Cnpj>" + cnpjTomador + "</Cnpj>"
    : cnpjTomador.length === 11
    ? "<Cpf>" + cnpjTomador + "</Cpf>"
    : "<Cnpj>00000000000000</Cnpj>";

  return '<?xml version="1.0" encoding="UTF-8"?>' +
    '<EnviarLoteRpsEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">' +
    '<LoteRps versao="2.04">' +
    '<NumeroLote>' + numeroRps + '</NumeroLote>' +
    '<CpfCnpj><Cnpj>' + cnpjPrestador + '</Cnpj></CpfCnpj>' +
    '<InscricaoMunicipal>' + inscricaoMunicipal + '</InscricaoMunicipal>' +
    '<QuantidadeRps>1</QuantidadeRps>' +
    '<ListaRps><Rps>' +
    '<InfDeclaracaoPrestacaoServico Id="rps' + numeroRps + '">' +
    '<Rps><IdentificacaoRps>' +
    '<Numero>' + numeroRps + '</Numero><Serie>1</Serie><Tipo>1</Tipo>' +
    '</IdentificacaoRps>' +
    '<DataEmissao>' + dataFormatada + '</DataEmissao>' +
    '<Status>1</Status></Rps>' +
    '<Competencia>' + dataFormatada + '</Competencia>' +
    '<Servico><Valores>' +
    '<ValorServicos>' + valorFormatado + '</ValorServicos>' +
    '<ValorDeducoes>0.00</ValorDeducoes><ValorPis>0.00</ValorPis>' +
    '<ValorCofins>0.00</ValorCofins><ValorInss>0.00</ValorInss>' +
    '<ValorIr>0.00</ValorIr><ValorCsll>0.00</ValorCsll>' +
    '<IssRetido>2</IssRetido><ValorIss>0.00</ValorIss>' +
    '<ValorIssRetido>0.00</ValorIssRetido>' +
    '<OutrasRetencoes>0.00</OutrasRetencoes>' +
    '<BaseCalculo>' + valorFormatado + '</BaseCalculo>' +
    '<Aliquota>0.00</Aliquota>' +
    '<ValorLiquidoNfse>' + valorFormatado + '</ValorLiquidoNfse>' +
    '<DescontoIncondicionado>0.00</DescontoIncondicionado>' +
    '<DescontoCondicionado>0.00</DescontoCondicionado>' +
    '</Valores>' +
    '<ItemListaServico>990101</ItemListaServico>' +
    '<CodigoCnae>7732201</CodigoCnae>' +
    '<CodigoTributacaoMunicipio>990101</CodigoTributacaoMunicipio>' +
    '<Discriminacao>Locacao de Munck - ' + (servico || "Elevacao de carga").substring(0, 80) + '</Discriminacao>' +
    '<CodigoMunicipio>2304400</CodigoMunicipio>' +
    '<ExigibilidadeISS>6</ExigibilidadeISS>' +
    '</Servico>' +
    '<Prestador><CpfCnpj><Cnpj>' + cnpjPrestador + '</Cnpj></CpfCnpj>' +
    '<InscricaoMunicipal>' + inscricaoMunicipal + '</InscricaoMunicipal></Prestador>' +
    '<Tomador><IdentificacaoTomador><CpfCnpj>' + cnpjTag + '</CpfCnpj></IdentificacaoTomador>' +
    '<RazaoSocial>' + (cliente || "NAO IDENTIFICADO").substring(0, 80) + '</RazaoSocial></Tomador>' +
    '<OptanteSimplesNacional>1</OptanteSimplesNacional>' +
    '<IncentivoFiscal>2</IncentivoFiscal>' +
    '</InfDeclaracaoPrestacaoServico></Rps></ListaRps></LoteRps></EnviarLoteRpsEnvio>';
}

exports.handler = async function (event) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "Method Not Allowed" };

  let body;
  try { body = JSON.parse(event.body); } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  if (body.action === "emitir_nfse") {
    try {
      const numeroRps = Date.now().toString().slice(-8);
      const xml = gerarXmlNFSe({ ...body.dados, numeroRps });
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ ok: true, numeroRps, xml })
      };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
    }
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: event.body
    });
    const data = await response.text();
    return { statusCode: response.status, headers, body: data };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
