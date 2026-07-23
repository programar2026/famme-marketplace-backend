# Backend — Marketplace de Moda Feminina

## Como pôr a correr localmente

1. Instalar PostgreSQL (ou criar uma base de dados grátis em [neon.tech](https://neon.tech) ou [supabase.com](https://supabase.com) — mais rápido para começar).
2. Correr o `schema.sql` nessa base de dados para criar as tabelas.
3. Copiar `.env.example` para `.env` e preencher `DATABASE_URL` e `JWT_SECRET`.
4. `npm install`
5. `npm run dev`

A API fica disponível em `http://localhost:4000/api`.

## Rotas principais

**Autenticação**
- `POST /api/auth/register` — registo de cliente
- `POST /api/auth/login` — login de cliente
- `POST /api/auth/seller/register` — registo de vendedora
- `POST /api/auth/seller/login` — login de vendedora

**Produtos**
- `GET /api/products?category=vestidos-gala&q=cetim` — listar/procurar (público)
- `GET /api/products/:id` — detalhe (público)
- `POST /api/products` — criar (vendedora autenticada)
- `PUT /api/products/:id` — editar (vendedora autenticada)
- `DELETE /api/products/:id` — remover (vendedora autenticada)

**Encomendas**
- `POST /api/orders` — criar encomenda a partir do carrinho (calcula automaticamente a comissão de cada vendedora)
- `POST /api/orders/:id/confirmar-pagamento` — chamado pelo gateway de pagamento quando o pagamento é confirmado
- `GET /api/orders/minhas` — encomendas da cliente autenticada
- `GET /api/orders/vendedora` — vendas e valor a receber da vendedora autenticada

## O que falta antes de ires ao ar

- Ligar o `payment_method` a um gateway real (Multicaixa Express / EMIS) — o campo `confirmar-pagamento` está pronto a receber o webhook assim que tiveres a conta comercial.
- Upload de imagens de produtos (hoje só há a tabela `product_images`, falta o serviço de armazenamento — ex: Cloudflare R2 ou AWS S3).
- Painel de administração para verificar/aprovar novas vendedoras (`sellers.status`).
- Envio de emails (confirmação de registo, confirmação de encomenda).
