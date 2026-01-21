require('dotenv').config();
const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');


const clienteRoutes = require('./src/routes/clienteRoutes');
const pedidoRoutes = require('./src/routes/pedidoRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');
const authRoutes = require('./src/routes/authRoutes');
const statusRoutes = require('./src/routes/statusRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const setorRoutes = require('./src/routes/setorRoutes');

const app = express();

// CORS gerenciado pelo API Gateway HTTP API v2
// Apenas garantindo que headers estejam presentes caso necessário
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  next();
});

app.use(express.json());

// Middleware para logs de todas as requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('[Request Headers]:', JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('[Request Body]:', JSON.stringify(req.body, null, 2));
  }
  next();
});

app.use('/clientes', clienteRoutes);
app.use('/pedidos', pedidoRoutes);
app.use('/upload', uploadRoutes);
app.use('/auth', authRoutes);
app.use('/status', statusRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/setores', setorRoutes);

app.get('/', (req, res) => {
  console.log('[Handler] Requisição recebida na rota raiz');
  res.status(200).json({ message: 'API Shoe Repair Lambda funcionando!' });
});

// Middleware para logs de todas as requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('[Request Headers]:', JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('[Request Body]:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Exporta o app para uso local
module.exports = app;

// Exporta o handler para AWS Lambda com configuração HTTP API v2
const serverlessHandler = serverless(app, {
  request: (request, event, context) => {
    // Garante que o contexto do evento seja preservado
    request.event = event;
    request.context = context;
  }
});

module.exports.handler = async (event, context) => {
  console.log('[Lambda] Função iniciada');
  console.log('[Lambda] Event:', JSON.stringify(event, null, 2));
  console.log('[Lambda] Context:', JSON.stringify(context, null, 2));
  
  // Tratamento especial para requisições OPTIONS (preflight CORS)
  if (event.requestContext && event.requestContext.http && event.requestContext.http.method === 'OPTIONS') {
    console.log('[Lambda] OPTIONS request detectado - retornando headers CORS');
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }
  
  try {
    const result = await serverlessHandler(event, context);
    console.log('[Lambda] Resposta gerada:', JSON.stringify(result, null, 2));
    
    // Adiciona headers CORS à resposta se não existirem
    if (result && result.headers) {
      result.headers['Access-Control-Allow-Origin'] = result.headers['Access-Control-Allow-Origin'] || '*';
      result.headers['Access-Control-Allow-Methods'] = result.headers['Access-Control-Allow-Methods'] || 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
      result.headers['Access-Control-Allow-Headers'] = result.headers['Access-Control-Allow-Headers'] || 'Content-Type, Authorization, X-Requested-With, Accept';
    }
    
    return result;
  } catch (error) {
    console.error('[Lambda] Erro na execução:', error);
    console.error('[Lambda] Stack trace:', error.stack);
    throw error;
  }
};
