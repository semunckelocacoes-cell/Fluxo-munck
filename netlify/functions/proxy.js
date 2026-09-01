const https = require("https");
const forge = require("node-forge");

// ── Busca certificado do Firebase ──
async function getCertFromFirebase() {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "locacao-de-munck-default-rtdb.firebaseio.com",
      path: "/config/certificado.json",
      method: "GET"
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          const certBase64 = (parsed.cert || parsed).trim().replace(/\s/g, "");
          resolve(Buffer.from(certBase64, "base64"));
        } catch(e) { reject(new Error("Erro ao parsear certificado: " + e.message)); }
      });
    });
    req.on("error", reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("Timeout ao buscar certificado")); });
    req.end();
  });
}

// ── Extrai chave e certificado do PFX ──
function extrairDoPfx(pfxBuffer, senha) {
  const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(pfxBuffer));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, senha);
  let privateKey = null, certificate = null;
  for (const sc of p12.safeContents) {
    for (const sb of sc.safeBags) {
      if (sb.type === forge.pki.oids.pkcs8ShroudedKeyBag || sb.type === forge.pki.oids.keyBag) {
        privateKey = sb.key;
      }
      if (sb.type === forge.pki.oids.certBag && !certificate) {
        certificate = sb.cert;
      }
    }
  }
  if (!privateKey || !certificate) throw new Error("Não foi possível extrair chave/certificado do PFX");
  return { privateKey, certificate };
}

// ── Assina XML no padrão XMLDSIG (ABRASF) ──
function assinarXml(xml, privateKey, certificate) {
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes();
  const certB64 = forge.util.encode64(certDer);

  // Digest SHA1 do XML
  const md = forge.md.sha1.create();
  md.update(xml, "utf8");
  const digestB64 = forge.util.encode64(md.digest().getBytes());

  // SignedInfo
  const signedInfo = '<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">' +
    '<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>' +
    '<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>' +
    '<Reference URI="">' +
    '<Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></Transforms>' +
    '<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>' +
    '<DigestValue>' + digestB64 + '</DigestValue>' +
    '</Reference></SignedInfo>';

  // Assina SignedInfo
  const mdSig = forge.md.sha1.create();
  mdSig.update(signedInfo, "utf8");
  const signatureB64 = forge.util.encode64(privateKey.sign(mdSig));

  const signatureBlock = '<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">' +
    signedInfo +
    '<SignatureValue>' + signatureB64 + '</SignatureValue>' +
    '<KeyInfo><X509Data><X509Certificate>' + certB64 + '</X509Certificate></X509Data></KeyInfo>' +
    '</Signature>';

  return xml.replace('</EnviarLoteRpsEnvio>', signatureBlock + '</EnviarLoteRpsEnvio>');
}

// ── Envia para webservice da prefeitura ──
async function enviarNFSe(xmlAssinado) {
  return new Promise((resolve, reject) => {
    const cabecalho = '<?xml version="1.0" encoding="UTF-8"?><cabecalho versao="2.04" xmlns="http://www.abrasf.org.br/nfse.xsd"><versaoDados>2.04</versaoDados></cabecalho>';
    const soap = '<?xml version="1.0" encoding="UTF-8"?>' +
      '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:e="http://nfse.fortaleza.ce.gov.br">' +
      '<soapenv:Header/><soapenv:Body><e:RecepcionarLoteRps>' +
      '<nfseCabecMsg><![CDATA[' + cabecalho + ']]></nfseCabecMsg>' +
      '<nfseDadosMsg><![CDATA[' + xmlAssinado + ']]></nfseDadosMsg>' +
      '</e:RecepcionarLoteRps></soapenv:Body></soapenv:Envelope>';

    const buf = Buffer.from(soap, "utf8");
    const req = https.request({
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
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout na prefeitura")); });
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
  const cnpjTag = cnpjTomador.length === 14 ? "<Cnpj>" + cnpjTomador + "</Cnpj>"
    : cnpjTomador.length === 11 ? "<Cpf>" + cnpjTomador + "</Cpf>"
    : "<Cnpj>00000000000000</Cnpj>";

  return '<?xml version="1.0" encoding="UTF-8"?>' +
    '<EnviarLoteRpsEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">' +
    '<LoteRps versao="2.04">' +
    '<NumeroLote>' + numeroRps + '</NumeroLote>' +
    '<CpfCnpj><Cnpj>' + cnpjPrestador + '</Cnpj></CpfCnpj>' +
    '<InscricaoMunicipal>' + inscricaoMunicipal + '</InscricaoMunicipal>' +
    '<QuantidadeRps>1</QuantidadeRps>' +
    '<ListaRps><Rps><InfDeclaracaoPrestacaoServico Id="rps' + numeroRps + '">' +
    '<Rps><IdentificacaoRps>' +
    '<Numero>' + numeroRps + '</Numero><Serie>1</Serie><Tipo>1</Tipo>' +
    '</IdentificacaoRps><DataEmissao>' + dataFormatada + '</DataEmissao><Status>1</Status></Rps>' +
    '<Competencia>' + dataFormatada + '</Competencia>' +
    '<Servico><Valores>' +
    '<ValorServicos>' + valorFormatado + '</ValorServicos>' +
    '<ValorDeducoes>0.00</ValorDeducoes><ValorPis>0.00</ValorPis>' +
    '<ValorCofins>0.00</ValorCofins><ValorInss>0.00</ValorInss>' +
    '<ValorIr>0.00</ValorIr><ValorCsll>0.00</ValorCsll>' +
    '<IssRetido>2</IssRetido><ValorIss>0.00</ValorIss>' +
    '<ValorIssRetido>0.00</ValorIssRetido><OutrasRetencoes>0.00</OutrasRetencoes>' +
    '<BaseCalculo>' + valorFormatado + '</BaseCalculo><Aliquota>0.00</Aliquota>' +
    '<ValorLiquidoNfse>' + valorFormatado + '</ValorLiquidoNfse>' +
    '<DescontoIncondicionado>0.00</DescontoIncondicionado>' +
    '<DescontoCondicionado>0.00</DescontoCondicionado></Valores>' +
    '<ItemListaServico>990101</ItemListaServico>' +
    '<CodigoCnae>7732201</CodigoCnae>' +
    '<CodigoTributacaoMunicipio>990101</CodigoTributacaoMunicipio>' +
    '<Discriminacao>Locacao de Munck - ' + (servico || "Elevacao de carga").substring(0, 80) + '</Discriminacao>' +
    '<CodigoMunicipio>2304400</CodigoMunicipio><ExigibilidadeISS>6</ExigibilidadeISS></Servico>' +
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
      const senha = process.env.CERT_PFX_SENHA || "";

      // 1. Busca certificado
      const pfxBuffer = await getCertFromFirebase();

      // 2. Extrai chave e cert
      const { privateKey, certificate } = extrairDoPfx(pfxBuffer, senha);

      // 3. Assina XML
      const xmlAssinado = assinarXml(xml, privateKey, certificate);

      // 4. Envia para prefeitura
      const resposta = await enviarNFSe(xmlAssinado);
      const rb = resposta.body;

      // 5. Analisa resposta
      const temNumero = rb.includes("NumeroNfse");
      const temErro = rb.includes("MensagemErro") || rb.includes("Fault");
      let mensagemErro = "";
      if (temErro) {
        const match = rb.match(/<Mensagem>(.*?)<\/Mensagem>/);
        mensagemErro = match ? match[1] : "Erro na prefeitura";
      }

      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          ok: !temErro,
          numeroRps,
          temNumeroNF: temNumero,
          temErro,
          mensagemErro,
          respostaPrefeitura: rb.substring(0, 800)
        })
      };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
    }
  }

  // Proxy Anthropic
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
