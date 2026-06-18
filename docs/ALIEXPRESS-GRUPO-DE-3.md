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

O envio para Telegram continua separado. Nao envie o lote enquanto houver aviso de rascunho ou link/preco nao conferido.
