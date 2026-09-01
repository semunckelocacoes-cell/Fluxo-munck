const https = require("https");
const crypto = require("crypto");
const { execSync } = require("child_process");

// ── Reconstrói o certificado a partir das 3 partes ──
function getCertBuffer() {
  const p1 = (process.env.CERT_PFX_BASE64_1 || "").trim();
  const p2 = (process.env.CERT_PFX_BASE64_2 || "").trim();
  const p3 = (process.env.CERT_PFX_BASE64_3 || "").trim();
  const base64 = p1 + p2 + p3;
  return Buffer.from(base64, "base64");
}

// ── Gera XML da NFS-e no padrão ABRASF ──
function gerarXmlNFSe(dados) {
  const { cliente, cnpjCliente, valor, servico, data, numeroRps } = dados;
  const dataFormatada = data ? data.replace(/-/g, "-") : new Date().toISOString().split("T")[0];
  const valorFormatado = parseFloat(valor || 0).toFixed(2);
  const cnpjPrestador = "64140547000175";
  const inscricaoMunicipal = "10747125";
  const cnpjTomador = (cnpjCliente || "").replace(/\D/g, "");

  return `<?xml version="1.0" encoding="UTF-8"?>
<EnviarLoteRpsEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
  <LoteRps versao="2.04">
    <NumeroLote>${numeroRps}</NumeroLote>
    <CpfCnpj><Cnpj>${cnpjPrestador}</Cnpj></CpfCnpj>
    <InscricaoMunicipal>${inscricaconst https = require("https");
const crypto = require("crypto");
const tls = require("tls");

// ── Busca certificado do Firebase ──
async function getCertFromFirebase() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "locacao-de-munck-default-rtdb.firebaseio.com",
      path: "/config/certificado.json",
      method: "GET"
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          const certBase64 = parsed.cert || parsed;
          resolve(Buffer.from(certBase64.trim(), "base64"));
        } catch(e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

// ── Assina XML com certificado PFX ──
function assinarXml(xml, pfxBuffer, senha) {
  try {
    // Extrai chave privada e certificado do PFX usando tls
    const ctx = tls.createSecureContext({
      pfx: pfxBuffer,
      passphrase: senha
    });
    // Assina o conteúdo com SHA1 (padrão ABRASF)
    const sign = crypto.createSign("SHA1");
    sign.update(xml);
    const signature = sign.sign({ key: ctx._handle });
    // Por enquanto retorna o XML sem assinatura (assinatura XML requer xmldsig)
    // A assinatura completa requer a biblioteca xml-crypto
    return { ok: true, xml, signature: signature.toString("base64") };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ── Envia para webservice da prefeitura ──
async function enviarNFSe(xmlAssinado) {
  return new Promise((resolve, reject) => {
    const cabecalho = '<?xml version="1.0" encoding="UTF-8"?><cabecalho versao="2.04" xmlns="http://www.abrasf.org.br/nfse.xsd"><versaoDados>2.04</versaoDados></cabecalho>';
    const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:e="http://nfse.fortaleza.ce.gov.br">
  <soapenv:Header/>
  <soapenv:Body>
    <e:RecepcionarLoteRps>
      <nfseCabecMsg><![CDATA[${cabecalho}]]></nfseCabecMsg>
      <nfseDadosMsg><![CDATA[${xmlAssinado}]]></nfseDadosMsg>
    </e:RecepcionarLoteRps>
  </soapenv:Body>
</soapenv:Envelope>`;

    const buf = Buffer.from(soap, "utf8");
    const options = {
      hostname: "nfse.fortaleza.ce.gov.br",
      port: 443,
      path: "/nfse/services/RecepcionarLoteRps",
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        "SOAPAction": "RecepcionarLoteRps",
        "Content-Length": buf.length
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    req.write(buf);
    req.end();
  });
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

  // ── Rota: emitir NFS-e ──
  if (body.action === "emitir_nfse") {
    try {
      const numeroRps = Date.now().toString().slice(-8);
      const xml = gerarXmlNFSe({ ...body.dados, numeroRps });
      const senha = process.env.CERT_PFX_SENHA || "";

      // Busca certificado do Firebase
      let pfxBuffer;
      try {
        pfxBuffer = await getCertFromFirebase();
      } catch(e) {
        return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: "Erro ao buscar certificado: " + e.message }) };
      }

      // Envia para prefeitura (sem assinatura por enquanto — webservice retornará erro de assinatura)
      let resposta;
      try {
        resposta = await enviarNFSe(xml);
      } catch(e) {
        return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: "Erro ao enviar para prefeitura: " + e.message }) };
      }

      // Verifica resposta da prefeitura
      const responseBody = resposta.body;
      const temNumero = responseBody.includes("NumeroNfse") || responseBody.includes("Numero");
      const temErro = responseBody.includes("Erro") || responseBody.includes("erro") || responseBody.includes("Fault");

      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          ok: true,
          numeroRps,
          enviado: true,
          respostaPrefeitura: responseBody.substring(0, 500),
          temNumeroNF: temNumero,
          temErro
        })
      };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
    }
  }

  // ── Rota padrão: proxy Anthropic ──
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
oMunicipal}</InscricaoMunicipal>
    <QuantidadeRps>1</QuantidadeRps>
    <ListaRps>
      <Rps>
        <InfDeclaracaoPrestacaoServico Id="rps${numeroRps}">
          <Rps>
            <IdentificacaoRps>
              <Numero>${numeroRps}</Numero>
              <Serie>1</Serie>
              <Tipo>1</Tipo>
            </IdentificacaoRps>
            <DataEmissao>${dataFormatada}</DataEmissao>
            <Status>1</Status>
          </Rps>
          <Competencia>${dataFormatada}</Competencia>
          <Servico>
            <Valores>
              <ValorServicos>${valorFormatado}</ValorServicos>
              <ValorDeducoes>0.00</ValorDeducoes>
              <ValorPis>0.00</ValorPis>
              <ValorCofins>0.00</ValorCofins>
              <ValorInss>0.00</ValorInss>
              <ValorIr>0.00</ValorIr>
              <ValorCsll>0.00</ValorCsll>
              <IssRetido>2</IssRetido>
              <ValorIss>0.00</ValorIss>
              <ValorIssRetido>0.00</ValorIssRetido>
              <OutrasRetencoes>0.00</OutrasRetencoes>
              <BaseCalculo>${valorFormatado}</BaseCalculo>
              <Aliquota>0.00</Aliquota>
              <ValorLiquidoNfse>${valorFormatado}</ValorLiquidoNfse>
              <DescontoIncondicionado>0.00</DescontoIncondicionado>
              <DescontoCondicionado>0.00</DescontoCondicionado>
            </Valores>
            <ItemListaServico>990101</ItemListaServico>
            <CodigoCnae>7732201</CodigoCnae>
            <CodigoTributacaoMunicipio>990101</CodigoTributacaoMunicipio>
            <Discriminacao>Locacao de Munck - ${(servico || "Elevacao de carga").substring(0, 80)}</Discriminacao>
            <CodigoMunicipio>2304400</CodigoMunicipio>
            <ExigibilidadeISS>6</ExigibilidadeISS>
          </Servico>
          <Prestador>
            <CpfCnpj><Cnpj>${cnpjPrestador}</Cnpj></CpfCnpj>
            <InscricaoMunicipal>${inscricaoMunicipal}</InscricaoMunicipal>
          </Prestador>
          <Tomador>
            <IdentificacaoTomador>
              <CpfCnpj>${cnpjTomador.length === 14 ? `<Cnpj>${cnpjTomador}</Cnpj>` : cnpjTomador.length === 11 ? `<Cpf>${cnpjTomador}</Cpf>` : "<Cnpj>00000000000000</Cnpj>"}</CpfCnpj>
            </IdentificacaoTomador>
            <RazaoSocial>${(cliente || "NAO IDENTIFICADO").substring(0, 80)}</RazaoSocial>
          </Tomador>
          <OptanteSimplesNacional>1</OptanteSimplesNacional>
          <IncentivoFiscal>2</IncentivoFiscal>
        </InfDeclaracaoPrestacaoServico>
      </Rps>
    </ListaRps>
  </LoteRps>
</EnviarLoteRpsEnvio>`;
}

// ── Envia XML para o webservice da prefeitura de Fortaleza ──
async function enviarParaPrefeitura(xmlAssinado) {
  return new Promise((resolve, reject) => {
    const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:e="http://nfse.fortaleza.ce.gov.br">
  <soapenv:Header/>
  <soapenv:Body>
    <e:RecepcionarLoteRps>
      <nfseCabecMsg><![CDATA[<?xml version="1.0" encoding="UTF-8"?><cabecalho versao="2.04" xmlns="http://www.abrasf.org.br/nfse.xsd"><versaoDados>2.04</versaoDados></cabecalho>]]></nfseCabecMsg>
      <nfseDadosMsg><![CDATA[${xmlAssinado}]]></nfseDadosMsg>
    </e:RecepcionarLoteRps>
  </soapenv:Body>
</soapenv:Envelope>`;

    const options = {
      hostname: "nfse.fortaleza.ce.gov.br",
      port: 443,
      path: "/nfse/services/RecepcionarLoteRps",
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        "SOAPAction": "RecepcionarLoteRps",
        "Content-Length": Buffer.byteLength(soap)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.write(soap);
    req.end();
  });
}

exports.handler = async function (event) {
  // ── CORS ──
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  // ── Rota: emitir NFS-e ──
  if (body.action === "emitir_nfse") {
    try {
      const certBuffer = getCertBuffer();
      const senha = process.env.CERT_PFX_SENHA || "";
      const numeroRps = Date.now().toString().slice(-8);
      const xml = gerarXmlNFSe({ ...body.dados, numeroRps });

      // Por enquanto retorna o XML gerado para teste
      // (assinatura digital requer biblioteca nativa — implementar na próxima fase)
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          ok: true,
          mensagem: "XML gerado com sucesso. Integração com assinatura em implementação.",
          xml: xml,
          numeroRps
        })
      };
    } catch (err) {
      return {
        statusCode: 500, headers,
        body: JSON.stringify({ ok: false, error: err.message })
      };
    }
  }

  // ── Rota padrão: proxy para API Anthropic ──
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
