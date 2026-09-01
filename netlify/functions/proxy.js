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
  const cnpjTomador = (cnpjCliente ||
