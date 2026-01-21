# 🚀 Quick Start - Amazon SES Setup

## ⚡ Setup em 5 Minutos

### 1️⃣ Verificar Email no AWS SES (2 min)

```bash
# 1. Acesse: https://console.aws.amazon.com/ses
# 2. Vá em: "Verified identities" → "Create identity"
# 3. Escolha: "Email address"
# 4. Digite: seu-email@exemplo.com
# 5. Clique: "Create identity"
# 6. Verifique: Abra seu email e clique no link de verificação
```

### 2️⃣ Configurar Variáveis de Ambiente (1 min)

Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

Edite `.env` e configure:
```bash
SES_FROM_EMAIL=seu-email@exemplo.com
SES_REPLY_TO_EMAIL=seu-email@exemplo.com
AWS_REGION=us-east-1
```

### 3️⃣ Adicionar Permissões IAM (1 min)

**Se usar AWS Lambda:**

Adicione esta política à IAM Role da função:
```json
{
  "Effect": "Allow",
  "Action": ["ses:SendEmail", "ses:SendRawEmail"],
  "Resource": "*"
}
```

**Se rodar localmente:**

Configure credenciais AWS:
```bash
aws configure
# Digite: Access Key, Secret Key, Region (us-east-1)
```

### 4️⃣ Testar (1 min)

**Opção A - Console AWS:**
1. Vá em SES Console → Verified identities
2. Clique no seu email → "Send test email"
3. Envie para você mesmo

**Opção B - Aplicação:**
```bash
# Crie um pedido pela API
POST /pedidos
{
  "clienteId": "123",
  "clientName": "Teste",
  "modeloTenis": "Nike",
  "servicos": [{"id": "1", "nome": "Limpeza", "preco": 50}]
}

# Verifique seu email!
```

## ✅ Checklist de Produção

### Antes de ir para produção:

- [ ] Email verificado no SES
- [ ] Variáveis de ambiente configuradas
- [ ] Permissões IAM adicionadas
- [ ] Testado envio de email
- [ ] Solicitado saída do Sandbox SES
- [ ] Configurado SPF/DKIM (opcional, mas recomendado)

### Solicitar Saída do Sandbox (para enviar para qualquer cliente)

```bash
# 1. Console SES → Account dashboard
# 2. "Request production access"
# 3. Preencha formulário:
#    - Mail type: Transactional
#    - Use case: Confirmações de pedidos
# 4. Aguarde aprovação (24-48h)
```

## 🆘 Problemas Comuns

### ❌ "Email address is not verified"

**Solução**: Verifique o email em SES Console → Verified identities

### ❌ "Access Denied"

**Solução**: Adicione permissão `ses:SendEmail` à IAM Role/User

### ❌ "Configuration set does not exist"

**Solução**: Remova qualquer referência a configuration set, não é necessário

### ❌ Email não chega

1. **No Sandbox?** → Verifique email do destinatário também no SES
2. **Verifique spam** → Peça cliente verificar pasta de spam
3. **Logs** → Procure por `[Email]` nos logs da aplicação

## 📊 Monitoramento

### Ver emails enviados:

1. Console SES → Account dashboard
2. Veja métricas: Sends, Deliveries, Bounces

### CloudWatch Logs:

```bash
# Procure por:
[Email] ✅ Email enviado com sucesso!
[Email] ❌ Erro ao enviar email:
```

## 💰 Custos

- **Primeiros 62.000 emails/mês**: GRÁTIS (se usar EC2)
- **Depois**: $0.10 por 1.000 emails
- **Exemplo**: 1000 pedidos/mês = 2000 emails = $0.20/mês

## 📚 Documentação Completa

- **[SES-EMAIL-README.md](SES-EMAIL-README.md)**: Documentação completa
- **[MIGRACAO-SES.md](MIGRACAO-SES.md)**: Detalhes da migração

## 🎯 Resultado Esperado

Quando tudo estiver funcionando:

1. Cliente faz pedido → Recebe email de confirmação
2. Status muda → Cliente recebe email de atualização
3. Pedido finalizado → Cliente recebe email bonito de conclusão

**Templates incluem**:
- ✅ Design HTML profissional
- ✅ Responsivo (mobile-friendly)
- ✅ Código do pedido em destaque
- ✅ Detalhes do serviço
- ✅ Instruções claras

---

**Pronto!** 🎉 Seu sistema agora envia emails profissionais com custo quase zero!

Próximo passo? Implementar SMS para notificações urgentes → Veja [SES-EMAIL-README.md](SES-EMAIL-README.md#-próximos-passos-sms)
