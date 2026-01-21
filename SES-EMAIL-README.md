# 📧 Configuração do Amazon SES (Simple Email Service)

## 📋 Visão Geral

Este projeto foi atualizado para usar **Amazon SES** em vez de WhatsApp para notificações de pedidos, focando na **redução de custos** e melhor controle sobre as comunicações.

### ✅ Vantagens do SES

- **💰 Custo baixíssimo**: $0.10 por 1.000 emails (muito mais barato que WhatsApp)
- **📈 Escalável**: Sem limites de conversações como WhatsApp
- **🎨 Personalização**: Templates HTML bonitos e profissionais
- **📊 Rastreamento**: Métricas de entrega, abertura e bounces
- **✉️ Profissional**: Emails são mais adequados para confirmações formais

## 🔧 Configuração Inicial

### 1. Configurar Amazon SES

#### 1.1 Verificar Email de Envio

1. Acesse o [Console AWS SES](https://console.aws.amazon.com/ses)
2. Vá em **Verified identities** (Identidades verificadas)
3. Clique em **Create identity**
4. Escolha **Email address** e insira seu email (ex: `noreply@suaempresa.com`)
5. Verifique o email na sua caixa de entrada clicando no link

#### 1.2 Sair do Sandbox (Produção)

Por padrão, SES está em **modo sandbox** (só envia para emails verificados).

Para enviar para qualquer cliente:

1. No console SES, vá em **Account dashboard**
2. Clique em **Request production access**
3. Preencha o formulário:
   - **Mail type**: Transactional
   - **Website URL**: URL do seu negócio
   - **Use case description**: "Envio de confirmações e atualizações de status de pedidos para clientes"
   - **Compliance**: Explique que os emails são solicitados pelos clientes
4. Aguarde aprovação (geralmente 24-48h)

**Enquanto estiver no sandbox**: Adicione manualmente os emails dos clientes em **Verified identities**

### 2. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env` ou configurações Lambda:

```bash
# Amazon SES - Email de Envio
SES_FROM_EMAIL=noreply@suaempresa.com
SES_REPLY_TO_EMAIL=contato@suaempresa.com

# AWS Region (onde está configurado o SES)
AWS_REGION=us-east-1

# Credenciais AWS (se não estiver usando IAM Role)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### 3. Configurar Permissões IAM

A função Lambda (ou usuário IAM) precisa da permissão `ses:SendEmail`.

**Política IAM mínima:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

Se usar Lambda, adicione esta política à **IAM Role** da função.

## 📬 Tipos de Emails Enviados

### 1. Confirmação de Pedido (Criado)
- **Quando**: Pedido é criado
- **Assunto**: ✅ Pedido #XXXXX - Confirmação de Recebimento
- **Conteúdo**: Código do pedido, detalhes do tênis e serviços

### 2. Pedido Finalizado
- **Quando**: Status = "Concluído" ou "Finalizado"
- **Assunto**: 🎊 Pedido #XXXXX - Finalizado! Pronto para Retirada
- **Conteúdo**: Notificação de conclusão e instruções de retirada

### 3. Atualização de Status
- **Quando**: Qualquer mudança de status
- **Assunto**: 📢 Pedido #XXXXX - Atualização de Status
- **Conteúdo**: Novo status e detalhes do pedido

## 🧪 Testando

### Teste Manual via AWS Console

1. Acesse [SES Console](https://console.aws.amazon.com/ses)
2. Vá em **Verified identities**
3. Selecione seu email verificado
4. Clique em **Send test email**
5. Envie um email de teste

### Teste na API

```bash
# Criar pedido (envia email de confirmação)
POST /pedidos
{
  "clienteId": "123",
  "clientName": "João Silva",
  "modeloTenis": "Nike Air Max",
  "servicos": [{"id": "1", "nome": "Limpeza profunda", "preco": 50}]
}

# Atualizar status (envia email de atualização)
PATCH /pedidos/{id}/status
{
  "status": "Finalizado"
}
```

## 💰 Custos e Otimização

### Comparação de Custos

| Serviço | Custo | Volume Exemplo |
|---------|-------|----------------|
| **WhatsApp** | ~$0.005 - $0.10 por conversa | 1000 pedidos = $5-100/mês |
| **SES** | $0.10 por 1000 emails | 1000 pedidos = $0.20/mês |
| **SMS (futuro)** | ~$0.05 por SMS | 1000 pedidos = $50/mês |

**Economia estimada**: 95-98% versus WhatsApp!

### Limites e Quotas

- **Modo Sandbox**: 200 emails/dia, apenas para emails verificados
- **Produção**: Começa com 200 emails/dia, aumenta automaticamente
- **Taxa de envio**: 1 email/segundo (aumenta conforme uso)

Para aumentar limites, solicite via [SES Sending Limits](https://console.aws.amazon.com/ses)

## 🔮 Próximos Passos: SMS

Está preparado no código a função `enviarSMSStatus()` para futura implementação via **AWS SNS**.

### Para Implementar SMS:

1. Descomentar código em [emailService.js](../src/services/emailService.js)
2. Configurar AWS SNS
3. Adicionar variável `SNS_REGION` nas configurações
4. Usar para notificações críticas (pedido finalizado)

### Estratégia Híbrida Sugerida:

- **Email**: Todas as atualizações (custo baixo)
- **SMS**: Apenas pedido finalizado (urgente, maior taxa de leitura)

## 📊 Monitoramento

### Métricas no Console SES

- **Sends**: Total de emails enviados
- **Deliveries**: Emails entregues com sucesso
- **Bounces**: Emails que retornaram (email inválido)
- **Complaints**: Marcações como spam

### CloudWatch

SES automaticamente envia métricas para CloudWatch:
- `NumberOfMessagesRejected`
- `Reputation.BounceRate`
- `Reputation.ComplaintRate`

## ❓ Troubleshooting

### Email não está sendo enviado

1. **Verificar logs**:
   ```bash
   # Procure por [Email] nos logs
   ```

2. **Verificar configuração**:
   - `SES_FROM_EMAIL` está definido?
   - Email está verificado no SES?
   - Região AWS está correta?

3. **Verificar permissões IAM**:
   - Lambda tem permissão `ses:SendEmail`?

### Email indo para spam

1. Configure **SPF, DKIM e DMARC** para seu domínio
2. No SES, vá em **Verified identities** > seu domínio > **Authentication**
3. Ative **DKIM signatures**

### Cliente não recebe emails

1. **No sandbox**: Email do cliente está verificado?
2. Verifique se o email do cliente está correto no cadastro
3. Peça ao cliente verificar pasta de spam

## 🔐 Segurança

### Boas Práticas

✅ **Use IAM Roles** em vez de Access Keys (para Lambda)
✅ **Não commite** credenciais no código
✅ **Use VPC endpoints** para SES (se Lambda estiver em VPC)
✅ **Monitore** taxa de bounce e complaints
✅ **Rotacione** Access Keys se usar fora de Lambda

### Compliance

- **LGPD**: Cliente forneceu email voluntariamente no cadastro
- **Anti-spam**: Emails são transacionais (confirmações solicitadas)
- **Opt-out**: Clientes podem responder solicitando não receber emails

## 📝 Campos Necessários

Para o sistema funcionar, certifique-se que o modelo de Cliente tem:

```javascript
{
  nome: String,      // Nome do cliente
  email: String,     // Email (obrigatório para notificações)
  telefone: String   // Telefone (para futuro SMS)
}
```

## 🛠️ Suporte

Em caso de problemas:

1. Verifique os logs da aplicação (`[Email]`)
2. Consulte [Documentação AWS SES](https://docs.aws.amazon.com/ses/)
3. Revise o código em [src/services/emailService.js](../src/services/emailService.js)

---

**Migração concluída com sucesso!** 🎉

Agora suas notificações são enviadas por email, economizando custos e oferecendo melhor experiência profissional.
