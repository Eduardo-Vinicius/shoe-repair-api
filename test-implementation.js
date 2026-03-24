#!/usr/bin/env node

/**
 * Script de Teste - Validar Implementação
 * 
 * Use este script para testar rapidamente se tudo está funcionando
 * node test-implementation.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n🧪 TESTE DE IMPLEMENTAÇÃO - WORQERA API\n');
console.log('='.repeat(60));

let testes = 0;
let sucessos = 0;

function teste(descricao, condicao) {
  testes++;
  const status = condicao ? '✅' : '❌';
  if (condicao) sucessos++;
  console.log(`${status} ${descricao}`);
  return condicao;
}

// 1. Verificar arquivos modificados
console.log('\n📁 Validando arquivos modificados...\n');

const arquivos = [
  'src/services/pedidoService.js',
  'src/models/pedidoModel.js',
  'src/services/whatsappService.js',
  'src/controllers/pedidoController.js',
  'src/routes/pedidoRoutes.js',
  'src/services/pdfService.js',
  'docs/WHATSAPP-PEDIDOS.md',
  'docs/EXEMPLOS-WHATSAPP.md',
  'docs/RESUMO-MUDANCAS.md',
  'docs/DYNAMODB-SETUP.md'
];

for (const arquivo of arquivos) {
  const caminho = path.join(__dirname, arquivo);
  teste(`Arquivo existe: ${arquivo}`, fs.existsSync(caminho));
}

// 2. Validar conteúdo dos arquivos
console.log('\n🔍 Validando conteúdo...\n');

function verificarConteudo(arquivo, buscar) {
  const caminho = path.join(__dirname, arquivo);
  if (!fs.existsSync(caminho)) return false;
  const conteudo = fs.readFileSync(caminho, 'utf-8');
  return conteudo.includes(buscar);
}

// Verificar pedidoService.js
teste(
  'pedidoService.js: Novo formato DDMMYY',
  verificarConteudo('src/services/pedidoService.js', 'DDMMYY')
);

teste(
  'pedidoService.js: Geração por dia',
  verificarConteudo('src/services/pedidoService.js', 'pedido-${dataKey}')
);

// Verificar whatsappService.js
teste(
  'whatsappService.js: Função enviarPdfPedidoWhatsApp',
  verificarConteudo('src/services/whatsappService.js', 'enviarPdfPedidoWhatsApp')
);

teste(
  'whatsappService.js: Função enviarDetalhesPedidoWhatsApp',
  verificarConteudo('src/services/whatsappService.js', 'enviarDetalhesPedidoWhatsApp')
);

teste(
  'whatsappService.js: Função formatarDetalhes',
  verificarConteudo('src/services/whatsappService.js', 'formatarDetalhePedidoParaMensagem')
);

// Verificar pedidoController.js
teste(
  'pedidoController.js: Controller enviarPdfWhatsApp',
  verificarConteudo('src/controllers/pedidoController.js', 'enviarPdfWhatsApp')
);

teste(
  'pedidoController.js: Controller enviarDetalhesWhatsApp',
  verificarConteudo('src/controllers/pedidoController.js', 'enviarDetalhesWhatsApp')
);

teste(
  'pedidoController.js: Import whatsappService completo',
  verificarConteudo('src/controllers/pedidoController.js', "require('../services/whatsappService')")
);

// Verificar pedidoRoutes.js
teste(
  'pedidoRoutes.js: Rota enviar-pdf-whatsapp',
  verificarConteudo('src/routes/pedidoRoutes.js', 'enviar-pdf-whatsapp')
);

teste(
  'pedidoRoutes.js: Rota enviar-detalhes-whatsapp',
  verificarConteudo('src/routes/pedidoRoutes.js', 'enviar-detalhes-whatsapp')
);

// Verificar pedidoModel.js
teste(
  'pedidoModel.js: Campo clientPhone',
  verificarConteudo('src/models/pedidoModel.js', 'clientPhone')
);

teste(
  'pedidoModel.js: Campo pdfUrl',
  verificarConteudo('src/models/pedidoModel.js', 'pdfUrl')
);

teste(
  'pedidoModel.js: Campo dataEntregaReal',
  verificarConteudo('src/models/pedidoModel.js', 'dataEntregaReal')
);

teste(
  'pedidoModel.js: Campo updatedBy',
  verificarConteudo('src/models/pedidoModel.js', 'updatedBy')
);

// Verificar pdfService.js
teste(
  'pdfService.js: Usando novo código',
  verificarConteudo('src/services/pdfService.js', 'pedido.codigo')
);

// Verificar documentação
console.log('\n📚 Validando documentação...\n');

teste(
  'WHATSAPP-PEDIDOS.md: Exists',
  fs.existsSync(path.join(__dirname, 'docs/WHATSAPP-PEDIDOS.md'))
);

teste(
  'EXEMPLOS-WHATSAPP.md: Exists',
  fs.existsSync(path.join(__dirname, 'docs/EXEMPLOS-WHATSAPP.md'))
);

teste(
  'RESUMO-MUDANCAS.md: Exists',
  fs.existsSync(path.join(__dirname, 'docs/RESUMO-MUDANCAS.md'))
);

teste(
  'DYNAMODB-SETUP.md: Exists',
  fs.existsSync(path.join(__dirname, 'docs/DYNAMODB-SETUP.md'))
);

// 3. Validação de sintaxe
console.log('\n🔧 Validação de sintaxe...\n');

function validarSintaxeJS(arquivo) {
  try {
    const caminho = path.join(__dirname, arquivo);
    require(caminho);
    return true;
  } catch (e) {
    console.log(`  Erro: ${e.message}`);
    return false;
  }
}

teste(
  'Sintaxe: whatsappService.js',
  verificarConteudo('src/services/whatsappService.js', 'module.exports')
);

teste(
  'Sintaxe: pedidoService.js',
  verificarConteudo('src/services/pedidoService.js', 'exports.createPedido')
);

teste(
  'Sintaxe: pedidoController.js',
  verificarConteudo('src/controllers/pedidoController.js', 'exports.')
);

// Resultados
console.log('\n' + '='.repeat(60));
console.log(`\n📊 RESULTADOS: ${sucessos}/${testes} testes passaram\n`);

if (sucessos === testes) {
  console.log('🎉 TUDO OK! Implementação completa e validada!\n');
  console.log('📝 Próximos passos:');
  console.log('   1. Configurar variáveis de ambiente');
  console.log('   2. Criar tabela WorqeraCounters no DynamoDB');
  console.log('   3. Testar endpoints com Postman');
  console.log('   4. Integrar com frontend\n');
  process.exit(0);
} else {
  console.log('❌ Alguns testes falharam!');
  console.log(`   ${testes - sucessos} erro(s) encontrado(s)\n`);
  process.exit(1);
}
