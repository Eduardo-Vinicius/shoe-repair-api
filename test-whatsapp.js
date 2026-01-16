require('dotenv').config();
const { enviarStatusPedido } = require('./src/services/whatsappService');

/**
 * Script de teste para validar a integração do WhatsApp
 * Execute com: node test-whatsapp.js
 */
async function testarWhatsApp() {
  console.log('🧪 Iniciando teste da integração WhatsApp...\n');

  // Verificar variáveis de ambiente
  console.log('📋 Verificando configurações:');
  console.log(`   WHATSAPP_TOKEN: ${process.env.WHATSAPP_TOKEN ? '✅ Configurado' : '❌ Ausente'}`);
  console.log(`   WHATSAPP_PHONE_NUMBER_ID: ${process.env.WHATSAPP_PHONE_NUMBER_ID ? '✅ Configurado' : '❌ Ausente'}\n`);

  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    console.log('❌ Configuração incompleta. Configure as variáveis no arquivo .env');
    console.log('📖 Consulte o arquivo .env.example para instruções');
    return;
  }

  // Dados de teste (substitua pelo telefone real para testar)
  const telefoneTeste = '5511999999999'; // Substitua por um telefone real para teste
  const nomeTeste = 'Cliente Teste';
  const statusTeste = 'criado';
  const servicosTeste = 'Reparo de sola e costura';
  const modeloTeste = 'Nike Air Max';

  console.log('📤 Enviando mensagem de teste...');
  console.log(`   Para: ${telefoneTeste}`);
  console.log(`   Nome: ${nomeTeste}`);
  console.log(`   Status: ${statusTeste}`);
  console.log(`   Serviços: ${servicosTeste}`);
  console.log(`   Modelo: ${modeloTeste}\n`);

  try {
    await enviarStatusPedido(
      telefoneTeste,
      nomeTeste,
      statusTeste,
      servicosTeste,
      modeloTeste
    );

    console.log('✅ Teste concluído! Verifique se a mensagem foi recebida no WhatsApp.');

  } catch (error) {
    console.log('❌ Erro durante o teste:', error.message);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  testarWhatsApp();
}

module.exports = { testarWhatsApp };