# AliExpress Grupo de 3

Fluxo seguro para preparar tres ofertas do AliExpress sem postar automaticamente.

## Estado atual

- O catalogo ja tem produtos AliExpress cadastrados.
- Esses produtos estao pausados porque os links e precos precisam ser conferidos antes de publicar.
- O script gera rascunhos em `out/` para revisao.

## Comandos

Gerar rascunho com os melhores tres produtos AliExpress, incluindo pausados:

```powershell
npm run aliexpress:grupo3
```

Gerar somente com produtos marcados como `Pronto`:

```powershell
npm run aliexpress:grupo3 -- --only-ready
```

Depois que os tres links forem validados manualmente, marcar o lote como `Pronto`:

```powershell
npm run aliexpress:grupo3 -- --mark-ready
```

## Saidas

```text
out/aliexpress-grupo3.json
out/aliexpress-grupo3.txt
```

## Envio integrado aos grupos

O fluxo geral agora prepara e valida os dois destinos:

```powershell
npm run groups:prepare
npm run groups:check
npm run groups:send
```

- As ofertas gerais seguem para `SHOPEE_TELEGRAM_CHAT_ID`.
- As tres ofertas AliExpress seguem para `ALIEXPRESS_TELEGRAM_CHAT_ID`.
- Cada oferta e enviada individualmente com sua propria imagem.
- O envio inteiro e cancelado se nao existirem exatamente tres produtos AliExpress marcados como `Pronto`.

## Regra absoluta de destino

As promocoes `Grupo de 3` sao exclusivas do grupo AliExpress.

- Nunca enviar ao canal geral.
- Nunca incluir no Top 5 geral.
- Nunca enviar aos grupos de Shopee, Amazon, Mercado Livre ou Magalu.
- Usar somente o destino `ALIEXPRESS_TELEGRAM_CHAT_ID`.
- No WhatsApp, usar somente o grupo identificado como AliExpress.

Nao marque produtos como `Pronto` enquanto nome, preco e link nao tiverem sido conferidos.
